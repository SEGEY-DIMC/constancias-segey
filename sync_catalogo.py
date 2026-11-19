import openpyxl
import json
import os
import re
import sys
import unicodedata
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCRATCH_DIR = r'C:/Users/danny.uh/.gemini/antigravity/scratch/constancia-cambios-web'
EXCEL_PATH = os.path.join(BASE_DIR, 'Catalogo_Funcionarios_y_Puestos.xlsx')

UNIDADES_BASE_DEF = [
    {
        "id": "despacho_secretario",
        "grupo": "Despacho del Secretario",
        "unidad": "Despacho del Secretario",
        "titular_nombre": "Dr. Juan Enrique Balam Várguez",
        "titular_cargo": "Secretario de Educación",
        "filtro_jefe": ["Dr. Juan Enrique Balam Várguez", "Mtro. Joaquín Jesús Díaz Mena"],
        "filtro_dir": ["Secretaría de Educación", "Secretaría Particular (A)", "Secretaría Particular (B)", "Secretaría Técnica"],
        "directo_only": True
    },
    {
        "id": "jefatura_despacho",
        "grupo": "Despacho del Secretario",
        "unidad": "Jefatura del Despacho",
        "titular_nombre": "Mtro. Jesús Clemente Orozco Rodríguez",
        "titular_cargo": "Jefe del Despacho",
        "filtro_jefe": ["Mtro. Jesús Clemente Orozco Rodríguez", "Jesús Clemente Orozco Rodríguez"],
        "filtro_dir": ["Jefatura del Despacho"],
        "directo_only": False
    },
    {
        "id": "dir_admin_finanzas",
        "grupo": "Direcciones Generales",
        "unidad": "Dirección de Administración y Finanzas",
        "titular_nombre": "C.P. Diara Gabriela Ivonne Lizama Martín",
        "titular_cargo": "Directora de Administración y Finanzas",
        "filtro_jefe": ["C.P. Diara Gabriela Ivonne Lizama Martín"],
        "filtro_dir": ["Dirección de Administración y Finanzas"],
        "directo_only": False
    },
    {
        "id": "dir_planeacion",
        "grupo": "Direcciones Generales",
        "unidad": "Dirección de Planeación",
        "titular_nombre": "Mtra. María Luisa Guillermo García",
        "titular_cargo": "Directora de Planeación",
        "filtro_jefe": ["Mtra. María Luisa Guillermo García"],
        "filtro_dir": ["Dirección de Planeación"],
        "directo_only": False
    },
    {
        "id": "dir_juridica",
        "grupo": "Direcciones Generales",
        "unidad": "Dirección Jurídica",
        "titular_nombre": "Lic. Moisés Radamés Ceballos Espinosa",
        "titular_cargo": "Director Jurídico",
        "filtro_jefe": ["Lic. Moisés Radamés Ceballos Espinosa"],
        "filtro_dir": ["Dirección Jurídica"],
        "directo_only": False
    },
    {
        "id": "dir_desarrollo_educativo",
        "grupo": "Direcciones Generales",
        "unidad": "Dirección de Desarrollo Educativo",
        "titular_nombre": "Dra. Julieta Pérez Altamirano",
        "titular_cargo": "Directora de Desarrollo Educativo",
        "filtro_jefe": ["Dra. Julieta Pérez Altamirano"],
        "filtro_dir": ["Dirección de Desarrollo Educativo"],
        "directo_only": False
    },
    {
        "id": "dir_servicios_regionales",
        "grupo": "Direcciones Generales",
        "unidad": "Dirección de Servicios Regionales",
        "titular_nombre": "Dr. Manuel del Jesús Larena España",
        "titular_cargo": "Director de Servicios Regionales",
        "filtro_jefe": ["Dr. Manuel del Jesús Larena España"],
        "filtro_dir": ["Dirección de Servicios Regionales"],
        "directo_only": False
    },
    {
        "id": "subsec_basica",
        "grupo": "Subsecretaría de Educación Básica",
        "unidad": "Subsecretaría de Educación Básica (Oficina Central)",
        "titular_nombre": "Mtro. Jaime Enrique Vázquez Barceló",
        "titular_cargo": "Subsecretario de Educación Básica",
        "filtro_jefe": ["Mtro. Jaime Enrique Vázquez Barceló"],
        "filtro_dir": ["Subsecretaría de Educación Básica"],
        "directo_only": True
    },
    {
        "id": "dir_inicial",
        "grupo": "Subsecretaría de Educación Básica",
        "unidad": "Dirección de Educación Inicial",
        "titular_nombre": "Lic. Evaly Viridiana Novelo Coello",
        "titular_cargo": "Directora de Educación Inicial",
        "filtro_jefe": ["Lic. Evaly Viridiana Novelo Coello"],
        "filtro_dir": ["Subsecretaría de Educación Básica"],
        "directo_only": False
    },
    {
        "id": "dir_preescolar",
        "grupo": "Subsecretaría de Educación Básica",
        "unidad": "Dirección de Educación Preescolar",
        "titular_nombre": "Mtra. Silvia Piedad Gutiérrez Pérez",
        "titular_cargo": "Directora de Educación Preescolar",
        "filtro_jefe": ["Mtra. Silvia Piedad Gutiérrez Pérez"],
        "filtro_dir": ["Subsecretaría de Educación Básica"],
        "directo_only": False
    },
    {
        "id": "dir_primaria",
        "grupo": "Subsecretaría de Educación Básica",
        "unidad": "Dirección de Educación Primaria",
        "titular_nombre": "Profa. Martha Leticia Del Sagrado Corazón Pinzón Cachón",
        "titular_cargo": "Directora de Educación Primaria",
        "filtro_jefe": ["Profa. Martha Leticia del Sagrado Corazón Pinzón Cachón", "Profa. Martha Leticia Del Sagrado Corazón Pinzón Cachón"],
        "filtro_dir": ["Subsecretaría de Educación Básica"],
        "directo_only": False
    },
    {
        "id": "dir_secundaria",
        "grupo": "Subsecretaría de Educación Básica",
        "unidad": "Dirección de Educación Secundaria",
        "titular_nombre": "Dr. Rigel Ismael Pino Medina",
        "titular_cargo": "Director de Educación Secundaria",
        "filtro_jefe": ["Dr. Rigel Ismael Pino Medina"],
        "filtro_dir": ["Subsecretaría de Educación Básica"],
        "directo_only": False
    },
    {
        "id": "dir_especial",
        "grupo": "Subsecretaría de Educación Básica",
        "unidad": "Dirección de Educación Especial",
        "titular_nombre": "Lic. Wendy Esperanza Pérez Polanco",
        "titular_cargo": "Directora de Educación Especial",
        "filtro_jefe": ["Lic. Wendy Esperanza Pérez Polanco"],
        "filtro_dir": ["Subsecretaría de Educación Básica"],
        "directo_only": False
    },
    {
        "id": "dir_indigena",
        "grupo": "Subsecretaría de Educación Básica",
        "unidad": "Dirección de Educación Indígena",
        "titular_nombre": "Lic. Martha Patricia Silveira Puerto",
        "titular_cargo": "Directora de Educación Indígena",
        "filtro_jefe": ["Lic. Martha Patricia Silveira Puerto"],
        "filtro_dir": ["Subsecretaría de Educación Básica"],
        "directo_only": False
    },
    {
        "id": "dir_fisica",
        "grupo": "Subsecretaría de Educación Básica",
        "unidad": "Dirección de Educación Física",
        "titular_nombre": "Lic. Mario Alberto Paredes León",
        "titular_cargo": "Director de Educación Física",
        "filtro_jefe": ["Lic. Mario Alberto Paredes León"],
        "filtro_dir": ["Subsecretaría de Educación Básica"],
        "directo_only": False
    },
    {
        "id": "dir_artistica",
        "grupo": "Subsecretaría de Educación Básica",
        "unidad": "Dirección de Educación Artística",
        "titular_nombre": "Mtra. Lourdes Candelaria Martín Heredia",
        "titular_cargo": "Directora de Educación Artística",
        "filtro_jefe": ["Profa. Lourdes Candelaria Martín Heredia", "Mtra. Lourdes Candelaria Martín Heredia"],
        "filtro_dir": ["Subsecretaría de Educación Básica"],
        "directo_only": False
    },
    {
        "id": "subsec_media_superior",
        "grupo": "Subsecretaría de Educación Media Superior",
        "unidad": "Subsecretaría de Educación Media Superior (Oficina Central)",
        "titular_nombre": "Lic. Miguel Ángel Pech Estrella",
        "titular_cargo": "Subsecretario de Educación Media Superior",
        "filtro_jefe": ["Lic. Miguel Ángel Pech Estrella"],
        "filtro_dir": ["Subsecretaría de Educación Media Superior"],
        "directo_only": True
    },
    {
        "id": "dir_serv_ed_media_sup",
        "grupo": "Subsecretaría de Educación Media Superior",
        "unidad": "Dirección de Servicios Educativos de Media Superior",
        "titular_nombre": "Lic. José Apolonio Montalvo Góngora",
        "titular_cargo": "Director de Servicios Educativos de Media Superior",
        "filtro_jefe": ["Lic. José Apolonio Montalvo Góngora"],
        "filtro_dir": ["Subsecretaría de Educación Media Superior"],
        "directo_only": False
    },
    {
        "id": "dir_desarrollo_media_sup",
        "grupo": "Subsecretaría de Educación Media Superior",
        "unidad": "Dirección de Desarrollo Educativo y Proyectos Estratégicos",
        "titular_nombre": "Dra. Karina Concepción González Herrera",
        "titular_cargo": "Directora de Desarrollo Educativo y Proyectos Estratégicos",
        "filtro_jefe": ["Dra. Karina Concepción González Herrera"],
        "filtro_dir": ["Subsecretaría de Educación Media Superior"],
        "directo_only": False
    },
    {
        "id": "subsec_superior",
        "grupo": "Subsecretaría de Educación Superior",
        "unidad": "Subsecretaría de Educación Superior (Oficina Central)",
        "titular_nombre": "Mtro. Everth de Jesús Dzib Peraza",
        "titular_cargo": "Subsecretario de Educación Superior",
        "filtro_jefe": ["Mtro. Everth de Jesús Dzib Peraza"],
        "filtro_dir": ["Subsecretaría de Educación Superior"],
        "directo_only": True
    },
    {
        "id": "dir_serv_profesional",
        "grupo": "Subsecretaría de Educación Superior",
        "unidad": "Dirección de Servicio Profesional",
        "titular_nombre": "Mtro. Luis Alejandro Carrillo Rosado",
        "titular_cargo": "Director de Servicio Profesional",
        "filtro_jefe": ["Mtro. Luis Alejandro Carrillo Rosado"],
        "filtro_dir": ["Subsecretaría de Educación Superior"],
        "directo_only": False
    },
    {
        "id": "dir_fortalecimiento_sup",
        "grupo": "Subsecretaría de Educación Superior",
        "unidad": "Dirección de Fortalecimiento de Educación Superior",
        "titular_nombre": "Mtro. Ernesto Jesús Mena Acevedo",
        "titular_cargo": "Director de Fortalecimiento de Educación Superior",
        "filtro_jefe": ["Mtro. Ernesto Jesús Mena Acevedo"],
        "filtro_dir": ["Subsecretaría de Educación Superior"],
        "directo_only": False
    },
    {
        "id": "cg_programas_estrategicos",
        "grupo": "Unidades de Apoyo",
        "unidad": "Coordinación General de Programas Estratégicos",
        "titular_nombre": "Prof. José Gabriel Peniche Ferreyro",
        "titular_cargo": "Coordinador General de Programas Estratégicos",
        "filtro_jefe": ["Prof. José Gabriel Peniche Ferreyro", "Lic. José Gabriel Peniche Ferreyro"],
        "filtro_dir": ["Coordinación General de Programas Estratégicos"],
        "directo_only": False
    },
    {
        "id": "cg_tic",
        "grupo": "Unidades de Apoyo",
        "unidad": "Coordinación General de Tecnologías de la Información y Comunicaciones",
        "titular_nombre": "Mtro. Gilberto Arturo Mastache Medina",
        "titular_cargo": "Coordinador General de Tecnologías de la Información y Comunicaciones",
        "filtro_jefe": ["Mtro. Gilberto Arturo Mastache Medina", "Lic. Gilberto Arturo Mastache Medina"],
        "filtro_dir": ["Coordinación General de Tecnologías de la Información y Comunicaciones"],
        "directo_only": False
    },
    {
        "id": "cg_ingles",
        "grupo": "Unidades de Apoyo",
        "unidad": "Coordinación General de Inglés",
        "titular_nombre": "Mtra. Nidia Karime Medina Pedro",
        "titular_cargo": "Coordinadora General de Inglés",
        "filtro_jefe": ["Mtra. Nidia Karime Medina Pedro"],
        "filtro_dir": ["Coordinación General de Inglés"],
        "directo_only": False
    },
    {
        "id": "cg_socioemocionales",
        "grupo": "Unidades de Apoyo",
        "unidad": "Coordinación General de Desarrollo de Habilidades Socioemocionales",
        "titular_nombre": "Mtra. Mónica de la Cruz Bargas Caporali",
        "titular_cargo": "Coordinadora General de Desarrollo de Habilidades Socioemocionales",
        "filtro_jefe": ["Mtra. Mónica de la Cruz Bargas Caporali"],
        "filtro_dir": ["Coordinación General de Desarrollo de Habilidades Socioemocionales"],
        "directo_only": False
    },
    {
        "id": "cg_intervencion",
        "grupo": "Unidades de Apoyo",
        "unidad": "Coordinación General de Intervención y Gestión Institucional",
        "titular_nombre": "Prof. Juan Ramón Centurión Cabrera",
        "titular_cargo": "Coordinador General de Intervención y Gestión Institucional",
        "filtro_jefe": ["Prof. Juan Ramón Centurión Cabrera", "Profr. Juan Ramón Centurión Cabrera"],
        "filtro_dir": ["Coordinación General de Intervención y Gestión Institucional"],
        "directo_only": False
    },
    {
        "id": "centro_bellas_artes",
        "grupo": "Unidades de Apoyo",
        "unidad": "Centro Estatal de Bellas Artes",
        "titular_nombre": "Prom. Cult. Renán Alberto Guillermo González",
        "titular_cargo": "Director del Centro Estatal de Bellas Artes",
        "filtro_jefe": ["Prom. Cult. Renán Alberto Guillermo González"],
        "filtro_dir": ["Centro Estatal de Bellas Artes"],
        "directo_only": False
    },
    {
        "id": "coord_becas",
        "grupo": "Unidades de Apoyo",
        "unidad": "Coordinación Estatal de Becas",
        "titular_nombre": "Lic. Flor Marina Valdez Aguilar",
        "titular_cargo": "Coordinadora Estatal de Becas",
        "filtro_jefe": ["Lic. Flor Marina Valdez Aguilar"],
        "filtro_dir": ["Coordinación Estatal de Becas"],
        "directo_only": False
    },
    {
        "id": "enlace_usicamm",
        "grupo": "Unidades de Apoyo",
        "unidad": "Enlace Estatal ante la Unidad del Sistema para la Carrera de las Maestras y los Maestros (USICAMM)",
        "titular_nombre": "Lic. Ricardo Hernán Homá Mendiburu",
        "titular_cargo": "Enlace Estatal ante la USICAMM",
        "filtro_jefe": ["Lic. Ricardo Hernán Homá Mendiburu", "Mtro. Ricardo Hernán Homá Mendiburu", "Mtro. Ricardo Hernán Homa Mendiburu"],
        "filtro_dir": ["Enlace Estatal ante la Unidad del Sistema para la Carrera de las Maestras y los Maestros (USICAMM)"],
        "directo_only": False
    },
    {
        "id": "casa_historia",
        "grupo": "Órganos Desconcentrados",
        "unidad": "Casa de la Historia de la Educación de Yucatán",
        "titular_nombre": "Br. Erika del Carmen Trujillo Pérez",
        "titular_cargo": "Coordinadora de la Casa de la Historia de la Educación de Yucatán",
        "filtro_jefe": ["Br. Erika del Carmen Trujillo Pérez"],
        "filtro_dir": ["Coordinación de la Casa de la Historia de la Educación de Yucatán"],
        "directo_only": False
    },
    {
        "id": "centro_eval_educativa",
        "grupo": "Órganos Desconcentrados",
        "unidad": "Centro de Evaluación Educativa del Estado de Yucatán",
        "titular_nombre": "Mtra. Elvira Martínez Guzmán",
        "titular_cargo": "Directora del Centro de Evaluación Educativa del Estado de Yucatán",
        "filtro_jefe": ["Mtra. Elvira Martínez Guzmán"],
        "filtro_dir": ["Dirección del Centro de Evaluación Educativa del Estado de Yucatán"],
        "directo_only": False
    },
    {
        "id": "univ_virtual",
        "grupo": "Órganos Desconcentrados",
        "unidad": "Universidad Virtual del Estado de Yucatán",
        "titular_nombre": "Mtro. José David Encalada Avilés",
        "titular_cargo": "Director de la Universidad Virtual del Estado de Yucatán",
        "filtro_jefe": ["Mtro. José David Encalada Avilés"],
        "filtro_dir": ["Dirección de la Universidad Virtual del Estado de Yucatán"],
        "directo_only": False
    }
]

def normalize(text):
    if not text: return ''
    text = unicodedata.normalize('NFD', str(text)).encode('ascii', 'ignore').decode('utf-8')
    return re.sub(r'[^a-zA-Z0-9]+', ' ', text).strip().lower()

def parse_nivel(s):
    if not s: return None, None
    s = str(s).strip()
    m = re.match(r'^([^-]+?)\s*-\s*([^(]+?)(?:\s*\([TI]-\d+.*)?$', s)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return s, ''

def sync(excel_path=EXCEL_PATH):
    if not os.path.exists(excel_path):
        return {"status": "error", "message": f"El archivo Excel no fue encontrado en: {excel_path}"}

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Iniciando sincronización desde {excel_path}...")
    wb = openpyxl.load_workbook(excel_path, data_only=True, read_only=True)

    # 1. Procesar Titulares de Unidad
    titulares_by_id = {}
    if "Titulares_de_Unidad" in wb.sheetnames:
        ws_tits = wb["Titulares_de_Unidad"]
        for row in ws_tits.iter_rows(values_only=True, min_row=2):
            if not row or not any(row): continue
            # Col 2: ID, Col 3: Unidad, Col 4: Titular, Col 5: Cargo, Col 6: Grupo
            u_id = str(row[1] or '').strip()
            if not u_id: continue
            titulares_by_id[u_id] = {
                "unidad": str(row[2] or '').strip(),
                "nombre": str(row[3] or '').strip(),
                "cargo": str(row[4] or '').strip(),
                "grupo": str(row[5] or '').strip() if len(row) > 5 else ''
            }

    # 2. Procesar Responsables de Captura
    responsables_map = {}
    if "Responsables_de_Captura" in wb.sheetnames:
        ws_resp = wb["Responsables_de_Captura"]
        for row in ws_resp.iter_rows(values_only=True, min_row=2):
            if not row or not any(row): continue
            # Col 2: Área, Col 3: Responsable
            area = str(row[1] or '').strip()
            resp = str(row[2] or '').strip()
            if area and resp:
                responsables_map[area] = resp

    # 3. Procesar Reporte de Funcionarios
    rows = []
    if "Reporte_Funcionarios" in wb.sheetnames:
        ws_func = wb["Reporte_Funcionarios"]
        headers = None
        for r_idx, row in enumerate(ws_func.iter_rows(values_only=True, min_row=1), 1):
            if r_idx == 1:
                headers = [str(c or '').strip() for c in row]
            else:
                if any(row):
                    rows.append(dict(zip(headers, row)))

    # Construir Catálogo Orgánico
    unidades_actuales = [dict(u) for u in UNIDADES_BASE_DEF]
    for u in unidades_actuales:
        u['filtro_jefe'] = list(u['filtro_jefe']) # copia
        u['filtro_dir'] = list(u['filtro_dir'])
        if u['id'] in titulares_by_id:
            info = titulares_by_id[u['id']]
            if info['nombre']:
                u['titular_nombre'] = info['nombre']
                if info['nombre'] not in u['filtro_jefe']:
                    u['filtro_jefe'].append(info['nombre'])
            if info['cargo']:
                u['titular_cargo'] = info['cargo']
            if info['unidad']:
                u['unidad'] = info['unidad']
            if info['grupo']:
                u['grupo'] = info['grupo']

    catalog = []
    for u in unidades_actuales:
        subordinados = []
        seen = set()

        for r in rows:
            nom = str(r.get('Nombre del Funcionario (Gr-Nom-Ap)') or '').strip()
            puesto = str(r.get('Puesto') or '').strip()
            if not nom or nom == "Vacante" or nom in u['filtro_jefe']:
                continue

            if u['directo_only']:
                jefe = str(r.get('Jefe Inmediato') or '').strip()
                matches = jefe in u['filtro_jefe']
            else:
                jefes = [str(r.get(f'Jefe_Nivel_{i:02d}', '')) for i in range(1, 11)] + [str(r.get('Jefe Inmediato', ''))]
                matches = any(any(alias.lower() in j.lower() for alias in u['filtro_jefe']) for j in jefes)

            if matches:
                key = f"{nom}|{puesto}"
                if key not in seen:
                    seen.add(key)
                    inm = 0
                    try:
                        inm = int(r.get('Subord. Inmediatos') or 0)
                    except:
                        pass
                    es_mando = (inm > 0) or any(kw in puesto.lower() for kw in ['jefe', 'coordinador', 'responsable', 'subdirector', 'subjefe', 'encargado', 'supervisor', 'enlace'])
                    subordinados.append({
                        "id": r.get('Num. Id. Func.'),
                        "nombre": nom,
                        "puesto": puesto,
                        "mando": es_mando,
                        "inm": inm
                    })

        subordinados.sort(key=lambda x: (not x['mando'], -x['inm'], x['puesto'], x['nombre']))

        catalog.append({
            "id": u["id"],
            "grupo": u["grupo"],
            "unidad": u["unidad"],
            "titular": {
                "nombre": u["titular_nombre"],
                "cargo": u["titular_cargo"]
            },
            "subordinados": subordinados
        })

    # Guardar assets/catalogo_organico.js
    cat_js_content = f"// Catálogo oficial generado automáticamente a partir de Catalogo_Funcionarios_y_Puestos.xlsx\n// Fecha de actualización: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\nconst CATALOGO_ORGANICO_SEGEY = {json.dumps(catalog, ensure_ascii=False, indent=2)};\n"
    target_cat_js = os.path.join(BASE_DIR, 'assets', 'catalogo_organico.js')
    with open(target_cat_js, 'w', encoding='utf-8') as f:
        f.write(cat_js_content)

    if os.path.exists(SCRATCH_DIR):
        try:
            with open(os.path.join(SCRATCH_DIR, 'assets', 'catalogo_organico.js'), 'w', encoding='utf-8') as f:
                f.write(cat_js_content)
        except Exception as e:
            print("Aviso al guardar copia en scratch:", e)

    # 4. Construir Mapa de Jefes Inmediatos
    nodes_list = []
    seen_nodes = set()

    for r in rows:
        nom = str(r.get('Nombre del Funcionario (Gr-Nom-Ap)') or '').strip()
        puesto = str(r.get('Puesto') or '').strip()
        direccion = str(r.get('Dirección') or '').strip()
        jefe_col8 = str(r.get('Jefe Inmediato') or '').strip()
        niveles = [r.get(f'Jefe_Nivel_{i:02d}') for i in range(1, 11) if r.get(f'Jefe_Nivel_{i:02d}')]

        if not puesto or puesto == 'None' or len(niveles) == 0:
            continue

        propio_nom, propio_cargo = parse_nivel(niveles[-1])
        jefe_nom, jefe_cargo = (None, None)
        if len(niveles) >= 2:
            jefe_nom, jefe_cargo = parse_nivel(niveles[-2])
        elif jefe_col8 and jefe_col8 != 'None':
            jefe_nom = jefe_col8
            jefe_cargo = 'Secretario de Educación'

        if not jefe_nom or jefe_nom == 'None':
            continue

        key = (nom, puesto, direccion)
        if key in seen_nodes:
            continue
        seen_nodes.add(key)

        aliases = [puesto]
        p = puesto
        p_clean = re.sub(r'^(?:Jefe|Jefa) de Departamento de\s+', 'Departamento de ', p, flags=re.I)
        p_clean = re.sub(r'^(?:Jefe|Jefa) de Departamento\s+', 'Departamento de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Jefe|Jefa)\s+del\s+Despacho', 'Jefatura del Despacho', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Subdirector|Subdirectora) de\s+', 'Subdirección de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Subdirector|Subdirectora)\s+', 'Subdirección ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Director|Directora)\s+Jur[ií]dic[oa]', 'Dirección Jurídica', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Director|Directora) de\s+', 'Dirección de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Director|Directora) del\s+', 'Dirección del ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Director|Directora)\s+', 'Dirección ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Coordinador|Coordinadora) General de\s+', 'Coordinación General de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Coordinador|Coordinadora)\s+Estatal\s+de\s+', 'Coordinación Estatal de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Coordinador|Coordinadora) de Área de\s+', 'Coordinación de Área de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Coordinador|Coordinadora) de\s+', 'Coordinación de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Coordinador|Coordinadora) Regional del\s+', '', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Responsable|Encargada|Encargado) de Área de\s+', 'Área de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Responsable|Encargada|Encargado) de Área del\s+', 'Área del ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Responsable|Encargada|Encargado) de Área\s+', 'Área ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Responsable|Encargada|Encargado) de\s+', 'Área de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Responsable|Encargada|Encargado) del\s+', 'Área del ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Jefe|Jefa) de Oficina de\s+', 'Oficina de ', p_clean, flags=re.I)
        p_clean = re.sub(r'^(?:Subjefe|Subjefa) de\s+', 'Subjefatura de ', p_clean, flags=re.I)

        if p_clean not in aliases:
            aliases.append(p_clean)

        ancestors_text = ' '.join(str(n) for n in niveles)

        if jefe_cargo:
            if 'Vallejos Albornoz' in jefe_nom and jefe_cargo.startswith('Subdirector'):
                jefe_cargo = 'Subdirectora' + jefe_cargo[11:]
            elif 'Lizama Martín' in jefe_nom and jefe_cargo.startswith('Director'):
                jefe_cargo = 'Directora' + jefe_cargo[8:]
            elif any(f in jefe_nom for f in ['Mtra.', 'Dra.', 'Profa.', 'Lic. María', 'Lic. Martha', 'Lic. Silvia', 'Lic. Wendy', 'C.P. Sonia']) and jefe_cargo.startswith('Director'):
                jefe_cargo = 'Directora' + jefe_cargo[8:]
            elif any(f in jefe_nom for f in ['Mtra.', 'Dra.', 'Profa.', 'Lic. María', 'Lic. Martha', 'Lic. Silvia', 'Lic. Wendy', 'C.P. Sonia']) and jefe_cargo.startswith('Subdirector'):
                jefe_cargo = 'Subdirectora' + jefe_cargo[11:]
            elif any(f in jefe_nom for f in ['Mtra.', 'Dra.', 'Profa.', 'Lic. María', 'Lic. Martha', 'Lic. Silvia', 'Lic. Wendy', 'C.P. Sonia']) and jefe_cargo.startswith('Coordinador'):
                jefe_cargo = 'Coordinadora' + jefe_cargo[11:]

        nodes_list.append({
            'aliases': aliases,
            'norm_aliases': [normalize(a) for a in aliases],
            'titular_nombre': nom,
            'titular_cargo': puesto,
            'jefe_nombre': jefe_nom,
            'jefe_cargo': jefe_cargo,
            'direccion': direccion,
            'ancestors_norm': normalize(ancestors_text)
        })

    jefes_js_content = f'''// =========================================================================
// MAPA OFICIAL DE JERARQUÍA DE JEFES INMEDIATOS - SEGEY
// Generado automáticamente a partir de Catalogo_Funcionarios_y_Puestos.xlsx
// Fecha de actualización: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// =========================================================================

const MAPA_JERARQUIA_JEFES = {json.dumps(nodes_list, ensure_ascii=False, indent=2)};

/**
 * Busca el Jefe Inmediato oficial (el que está a la izquierda en la jerarquía)
 * correspondiente al Área o Departamento seleccionado en Baja o Cambio de nombre.
 * @param {{string}} areaSeleccionada Nombre del área o puesto que cambia de nombre o causa baja.
 * @param {{string}} areaNotificadora Nombre del Área que Notifica o Elabora (para desambiguar).
 * @returns {{{{ jefe_nombre: string, jefe_cargo: string, titular_nombre: string, titular_cargo: string }} | null}}
 */
function buscarJefeInmediatoPorArea(areaSeleccionada, areaNotificadora = '') {{
  if (!areaSeleccionada || typeof MAPA_JERARQUIA_JEFES === 'undefined' || !Array.isArray(MAPA_JERARQUIA_JEFES)) {{
    return null;
  }}

  function normalize(t) {{
    if (!t) return '';
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }}

  const nSel = normalize(areaSeleccionada);
  if (!nSel) return null;

  // 1. Buscar coincidencias exactas o parciales en los alias del área/puesto
  const exactCandidates = [];
  const partialCandidates = [];

  for (let i = 0; i < MAPA_JERARQUIA_JEFES.length; i++) {{
    const node = MAPA_JERARQUIA_JEFES[i];
    if (node.norm_aliases.includes(nSel)) {{
      exactCandidates.push(node);
    }} else if (node.norm_aliases.some(a => a === nSel || a.includes(nSel) || nSel.includes(a))) {{
      partialCandidates.push(node);
    }}
  }}

  const candidates = exactCandidates.length > 0 ? exactCandidates : partialCandidates;
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // 2. Si hay múltiples candidatos, desambiguar utilizando el Área Notificadora
  if (areaNotificadora) {{
    const nNotif = normalize(areaNotificadora);
    let bestScore = -1;
    let bestCand = null;

    const notifWords = nNotif.split(/\\s+/).filter(w => w.length > 3 && !['departamento', 'direccion', 'coordinacion', 'area', 'para', 'general'].includes(w));

    for (let j = 0; j < candidates.length; j++) {{
      const c = candidates[j];
      let score = 0;
      if (c.ancestors_norm.includes(nNotif)) {{
        score += 20;
      }}
      if (c.direccion && normalize(c.direccion).includes(nNotif)) {{
        score += 15;
      }}
      for (const w of notifWords) {{
        if (c.ancestors_norm.includes(w)) score += 3;
      }}
      if (score > bestScore) {{
        bestScore = score;
        bestCand = c;
      }}
    }}

    if (bestCand && bestScore > 0) return bestCand;
  }}

  return candidates[0];
}}

if (typeof window !== 'undefined') {{
  window.MAPA_JERARQUIA_JEFES = MAPA_JERARQUIA_JEFES;
  window.buscarJefeInmediatoPorArea = buscarJefeInmediatoPorArea;
}}
'''

    target_jefes_js = os.path.join(BASE_DIR, 'assets', 'mapa_jefes_inmediatos.js')
    with open(target_jefes_js, 'w', encoding='utf-8') as f:
        f.write(jefes_js_content)

    if os.path.exists(SCRATCH_DIR):
        try:
            with open(os.path.join(SCRATCH_DIR, 'assets', 'mapa_jefes_inmediatos.js'), 'w', encoding='utf-8') as f:
                f.write(jefes_js_content)
        except Exception as e:
            pass

    # 5. Guardar responsables_enlace.json
    resp_json_path = os.path.join(BASE_DIR, 'assets', 'responsables_enlace.json')
    with open(resp_json_path, 'w', encoding='utf-8') as f:
        json.dump(responsables_map, f, ensure_ascii=False, indent=2)

    # 6. Actualizar bloque ENLACE_DIRECTO_POR_AREA en app.js
    if responsables_map:
        app_js_path = os.path.join(BASE_DIR, 'app.js')
        if os.path.exists(app_js_path):
            with open(app_js_path, 'r', encoding='utf-8') as f:
                app_content = f.read()

            formatted_entries = []
            for a, r in sorted(responsables_map.items()):
                safe_a = a.replace("'", "\\'")
                safe_r = r.replace("'", "\\'")
                formatted_entries.append(f"  '{safe_a}': '{safe_r}'")
            new_block = "const ENLACE_DIRECTO_POR_AREA = {\n" + ",\n".join(formatted_entries) + "\n};"

            app_content_updated = re.sub(
                r'const ENLACE_DIRECTO_POR_AREA\s*=\s*\{[\s\S]*?\};',
                new_block,
                app_content
            )
            with open(app_js_path, 'w', encoding='utf-8') as f:
                f.write(app_content_updated)

            if os.path.exists(SCRATCH_DIR):
                try:
                    with open(os.path.join(SCRATCH_DIR, 'app.js'), 'w', encoding='utf-8') as f:
                        f.write(app_content_updated)
                except Exception:
                    pass

    result = {
        "status": "ok",
        "excel_path": excel_path,
        "unidades_actualizadas": len(catalog),
        "funcionarios_totales": len(rows),
        "nodos_jefes_jerarquia": len(nodes_list),
        "responsables_enlace": len(responsables_map),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "responsables": responsables_map
    }
    print(f"[{result['timestamp']}] Sincronización exitosa: {result['unidades_actualizadas']} unidades, {result['funcionarios_totales']} funcionarios, {result['nodos_jefes_jerarquia']} jefes, {result['responsables_enlace']} enlaces.")
    return result

if __name__ == "__main__":
    res = sync()
    print(json.dumps({k: v for k, v in res.items() if k != 'responsables'}, indent=2))
