#!/usr/bin/env python3
"""
Servidor local para el Sistema de Constancias de Cambios (SEGEY)
Incluye motor de generación oficial:
- Servidor web estático para la interfaz interactiva y red local (LAN/Wi-Fi)
- Endpoint POST /api/generate-word-pdf: Genera PDF nativo usando la plantilla oficial Word y Word COM
- Endpoint POST /api/generate-docx: Genera documento Word (.docx) oficial con datos capturados
- Endpoint POST /api/upload-docx-layout: Permite subir nuevas plantillas Word para layouts dinámicos

Ejecutar con: python server.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import socket
import json
import tempfile
import traceback

PORT = 8000

# Asegurar directorio de trabajo
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import fill_docx
import sync_catalogo

EXCEL_FILE = os.path.join(BASE_DIR, 'Catalogo_Funcionarios_y_Puestos.xlsx')
_last_excel_mtime = 0

def check_and_auto_sync_excel():
    global _last_excel_mtime
    if os.path.exists(EXCEL_FILE):
        try:
            mtime = os.path.getmtime(EXCEL_FILE)
            if _last_excel_mtime == 0:
                _last_excel_mtime = mtime
            elif mtime > _last_excel_mtime:
                print(f"[AUTO-SYNC] Cambio detectado en Catalogo_Funcionarios_y_Puestos.xlsx ({mtime} > {_last_excel_mtime}). Sincronizando...")
                _last_excel_mtime = mtime
                sync_catalogo.sync(EXCEL_FILE)
        except Exception as e:
            print("Error verificando o sincronizando Excel:", e)

def get_ip():
    """Obtiene la IP local para compartir en la red institucional o Wi-Fi"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

_word_app = None

def get_word():
    global _word_app
    import pythoncom
    import win32com.client
    pythoncom.CoInitialize()
    if _word_app is None:
        try:
            _word_app = win32com.client.Dispatch('Word.Application')
            _word_app.Visible = False
            _word_app.DisplayAlerts = 0
        except Exception as e:
            print(f"Error iniciando Word: {e}")
            _word_app = None
    return _word_app

def convert_docx_to_pdf_word(docx_path, pdf_path):
    """Convierte un documento .docx a PDF usando Microsoft Word COM nativo de forma aislada por hilo"""
    import pythoncom
    import win32com.client
    pythoncom.CoInitialize()
    word = None
    try:
        word = win32com.client.DispatchEx('Word.Application')
        word.Visible = False
        word.DisplayAlerts = 0
        doc = word.Documents.Open(os.path.abspath(docx_path))
        doc.SaveAs(os.path.abspath(pdf_path), FileFormat=17)
        doc.Close(False)
    finally:
        if word is not None:
            try:
                word.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()

def parse_json_body(body):
    for enc in ['utf-8', 'latin-1', 'cp1252']:
        try:
            return json.loads(body.decode(enc))
        except (UnicodeDecodeError, json.JSONDecodeError):
            pass
    return json.loads(body.decode('utf-8', errors='replace'))

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    timeout = 90

    def end_headers(self):
        # Evitar problemas de caché durante desarrollo y pruebas
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Access-Control-Expose-Headers', 'Content-Disposition')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        check_and_auto_sync_excel()
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = {"status": "ok", "wordAvailable": True, "server": "SEGEY Constancias Engine"}
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return
        elif self.path == '/api/sync-excel':
            global _last_excel_mtime
            try:
                # Sincronización oficial: lectura directa del archivo Excel y regeneración de mapas
                res = sync_catalogo.sync(EXCEL_FILE)
                if os.path.exists(EXCEL_FILE):
                    _last_excel_mtime = os.path.getmtime(EXCEL_FILE)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return
        elif self.path == '/api/records':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            records_file = os.path.join(BASE_DIR, 'bitacora_constancias.json')
            if os.path.exists(records_file):
                try:
                    with open(records_file, 'rb') as f:
                        self.wfile.write(f.read())
                    return
                except Exception as e:
                    print(f"Error leyendo bitacora_constancias.json: {e}")
            self.wfile.write(b'[]')
            return
        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        # 1. GENERAR PDF NATIVO DE WORD
        if self.path == '/api/generate-word-pdf':
            try:
                data = parse_json_body(body)
                template_path = os.path.join(BASE_DIR, 'plantilla_oficial_base.docx')
                
                folio = data.get('folio', 'DIMC').replace('/', '_').replace('\\', '_')
                filename_pdf = f"Constancia_Cambios_{folio}.pdf"

                with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp_docx:
                    temp_docx_path = tmp_docx.name
                temp_pdf_path = temp_docx_path.replace('.docx', '.pdf')

                try:
                    import importlib
                    importlib.reload(fill_docx)
                    fill_docx.generate_filled_docx(data, template_path, temp_docx_path)
                    convert_docx_to_pdf_word(temp_docx_path, temp_pdf_path)

                    with open(temp_pdf_path, 'rb') as f:
                        pdf_bytes = f.read()

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/pdf')
                    self.send_header('Content-Disposition', f'attachment; filename="{filename_pdf}"')
                    self.send_header('Content-Length', str(len(pdf_bytes)))
                    self.end_headers()
                    self.wfile.write(pdf_bytes)
                finally:
                    if os.path.exists(temp_docx_path):
                        try: os.remove(temp_docx_path)
                        except: pass
                    if os.path.exists(temp_pdf_path):
                        try: os.remove(temp_pdf_path)
                        except: pass
                return

            except Exception as e:
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        # 2. GENERAR ARCHIVO WORD (.DOCX) RELLENO
        elif self.path == '/api/generate-docx':
            try:
                data = parse_json_body(body)
                template_path = os.path.join(BASE_DIR, 'plantilla_oficial_base.docx')
                
                folio = data.get('folio', 'DIMC').replace('/', '_').replace('\\', '_')
                filename_docx = f"Constancia_Cambios_{folio}.docx"

                with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp_docx:
                    temp_docx_path = tmp_docx.name

                try:
                    import importlib
                    importlib.reload(fill_docx)
                    fill_docx.generate_filled_docx(data, template_path, temp_docx_path)

                    with open(temp_docx_path, 'rb') as f:
                        docx_bytes = f.read()

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                    self.send_header('Content-Disposition', f'attachment; filename="{filename_docx}"')
                    self.send_header('Content-Length', str(len(docx_bytes)))
                    self.end_headers()
                    self.wfile.write(docx_bytes)
                finally:
                    if os.path.exists(temp_docx_path):
                        try: os.remove(temp_docx_path)
                        except: pass
                return

            except Exception as e:
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        # 3. ALMACENAR / SINCRONIZAR BITÁCORA CENTRALIZADA DE CONSTANCIAS EN DISCO
        elif self.path == '/api/records':
            try:
                data = parse_json_body(body)
                records_file = os.path.join(BASE_DIR, 'bitacora_constancias.json')
                with open(records_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                count = len(data) if isinstance(data, list) else 1
                self.wfile.write(json.dumps({"status": "ok", "count": count, "file": "bitacora_constancias.json"}).encode('utf-8'))
                return
            except Exception as e:
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        # 4. SINCRONIZACIÓN MANUAL BAJO DEMANDA DESDE GOOGLE SHEETS / EXCEL
        elif self.path == '/api/sync-excel':
            global _last_excel_mtime
            try:
                # Sincronización oficial: lectura directa del archivo Excel y regeneración de mapas
                res = sync_catalogo.sync(EXCEL_FILE)
                if os.path.exists(EXCEL_FILE):
                    _last_excel_mtime = os.path.getmtime(EXCEL_FILE)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
                return
                return
            except Exception as e:
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

def run():
    ip_local = get_ip()
    local_url = f"http://localhost:{PORT}"
    network_url = f"http://{ip_local}:{PORT}"
    share_url = f"http://{ip_local}:{PORT}?mode=form"

    print("=" * 75)
    print("  SISTEMA DE GESTIÓN DE CONSTANCIAS DE CAMBIOS (SEGEY)")
    print("  Motor oficial Word + Generador Web PDF Integrado")
    print("=" * 75)
    print(f" Servidor iniciado en:")
    print(f"   -> En tu computadora: {local_url}")
    print(f"   -> Para compartir en red local (LAN / Wi-Fi): {network_url}")
    print(f"   -> Enlace directo para captura de áreas: {share_url}")
    if os.path.exists(EXCEL_FILE):
        print(f"   -> Catálogo Excel Maestro: {os.path.basename(EXCEL_FILE)} (Sincronización activa)")
        global _last_excel_mtime
        _last_excel_mtime = os.path.getmtime(EXCEL_FILE)
    print("=" * 75)
    print(" Presione Ctrl + C en esta ventana para detener el servidor.\n")

    try:
        webbrowser.open(local_url)
    except Exception:
        pass

    with ThreadedTCPServer(("", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")

if __name__ == "__main__":
    run()
