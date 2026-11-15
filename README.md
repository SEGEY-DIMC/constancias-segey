# Sistema Web de Constancias de Cambios de Unidad Administrativa
### Secretaría de Educación del Estado de Yucatán (SEGEY)

Herramienta oficial diseñada para el llenado en línea, control centralizado en bitácora, exportación a Excel y **generación directa de documentos PDF y Word (.docx) con el formato y membretes institucionales exactos**.

---

## 📋 Características Principales

1. **Encabezado y Pie de Página Oficiales del Documento Word Conservados:**
   - **Encabezado institucional:** Tabla oficial de 3 columnas con borde gris (`#A6A6A6`):
     - **Columna izquierda:** Escudo oficial del Gobierno del Estado de Yucatán.
     - **Columna central:** `SECRETARÍA DE EDUCACIÓN` / `Dirección de Administración y Finanzas`.
     - **Columna derecha:** Logotipo institucional de la SEGEY.
     - **Fila inferior (ancho completo):** `Constancia de cambios de denominación o dependencia jerárquica en las unidades administrativas`.
   - **Pie de página oficial:**
     - Código de calidad institucional: `F-PR-EAO-03 R01` (alineado a la izquierda).
     - Paginación oficial: `Página 1 de 1` (alineado a la derecha).

2. **Cuerpo Limpio en Texto Corrido (Sin Cuadros ni Cuadrículas Pesadas):**
   - Se eliminaron los bordes de recuadros en todos los apartados (Representantes de la Secretaría de Educación involucrados, Determinación de Unidad y Justificación).
   - Se mantiene la redacción institucional legal y las líneas horizontales para las 5 rúbricas físicas:
     - Titular de Unidad Administrativa 1 y 2 (arriba)
     - Titular de Área (al centro)
     - Testigo de Asistencia 1 y 2 (abajo)

3. **Captura Separada de Nombre y Cargo:**
   - Cada compareciente cuenta con dos recuadros independientes:
     - Primer recuadro: **Nombre completo**.
     - Segundo recuadro: **Cargo o puesto institucional**.
   - En el documento impreso, el PDF y el Word, el cargo se ubica automáticamente en la redacción de comparecientes y debajo de la línea de firma, evitando confusiones o encimado de texto.

4. **Doble Motor de Generación Directa (Sin Cuadro de Impresión Web):**
   - **Descargar PDF Oficial:**
     - Al presionar **"Descargar PDF Oficial"**, el sistema genera y descarga directamente el archivo `.pdf` (ej. `Constancia_Cambios_SEGEY-CC-2026-001.pdf`).
     - No abre la ventana de impresión del navegador (`window.print()`).
     - Si `python server.py` está corriendo, utiliza la plantilla oficial de Word (`plantilla_oficial_base.docx`) para compilar un PDF 100% nativo de Microsoft Word con calidad tipográfica perfecta. Si no, utiliza el motor autónomo cliente `html2pdf.js`.
   - **Descargar Word (.docx) Oficial:**
     - Botón directo para descargar la constancia rellena en formato editable Microsoft Word `.docx`.

5. **Gestor de Layouts y Plantillas en Bitácora:**
   - Permite subir, cambiar y regenerar constancias con plantillas personalizadas.
   - Las solicitudes históricas de la bitácora se pueden descargar en PDF o Word con cualquier diseño activo.

---

## 🚀 Cómo Ejecutar el Sistema

### Opción A (Recomendada con todas las funciones):
Abre una terminal o PowerShell en la carpeta del proyecto y ejecuta:
```bash
python server.py
```
- Se abrirá automáticamente tu navegador en `http://localhost:8000`.
- Tendrás disponibles tanto la descarga en **PDF oficial** como en **Word (.docx)** editable.
- Verás en pantalla el enlace de red local (ej. `http://192.168.x.x:8000?mode=form`) para compartir con otras áreas de la secretaría.

### Opción B (Uso local sin servidor):
Haz doble clic sobre el archivo [`index.html`](file:///C:/Users/danny.uh/.gemini/antigravity/scratch/constancia-cambios-web/index.html) para abrirlo en cualquier navegador (Chrome, Edge, Firefox). Generará el PDF oficial directamente en tu navegador usando la librería local `html2pdf.bundle.min.js`.

---

## 📁 Archivos del Proyecto

- `index.html`: Interfaz web interactiva (Formulario, Vista de Documento con logos, Bitácora y Compartir).
- `app.js`: Lógica de la aplicación, motor de plantillas, guardado en bitácora y llamadas de descarga.
- `styles.css`: Estilos visuales institucionales con tipografía Lato y formato de hoja oficial.
- `server.py`: Servidor local con API para generación nativa de PDF y DOCX con Word.
- `fill_docx.py`: Módulo en Python que toma `plantilla_oficial_base.docx` y vacía los datos capturados.
- `plantilla_oficial_base.docx`: Archivo Word original con el encabezado oficial, logotipos y pie de página.
- `plantilla_layout_base.html`: Plantilla base en HTML con todas las etiquetas dinámicas.
- `assets/image1.png`: Escudo oficial del Gobierno del Estado de Yucatán.
- `assets/image2.png`: Logotipo oficial de la Secretaría de Educación (SEGEY).
- `assets/logos_base64.js`: Base64 embebido para carga instantánea de imágenes en el PDF.
- `html2pdf.bundle.min.js`: Motor autónomo de PDF local para el navegador.
