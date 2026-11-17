import os
import docx
from docx.shared import Pt, Inches, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def generate_filled_docx(data, template_path, output_path):
    """
    Toma plantilla_oficial_base.docx (con membrete de 3 columnas y pie oficial intactos de SEGEY)
    e inserta el contenido capturado respetando la distribución visual oficial del documento:
    - Tipografía Lato tamaño 11 en cuerpo, justificado en párrafos narrativos.
    - Distribución a 2 columnas para comparecientes (etiqueta a la izquierda, nombres y cargos a la derecha).
    - Espacio amplio y razonable arriba de cada línea de firma.
    - Garantiza ajuste perfecto en exactamente 1 sola página.
    """
    doc = docx.Document(template_path)
    
    # Márgenes calibrados (margen superior y encabezado bajados 3mm para evitar corte en impresión física)
    section = doc.sections[0]
    section.top_margin = Cm(1.1)
    section.bottom_margin = Cm(0.7)
    section.left_margin = Cm(1.8)
    section.right_margin = Cm(1.8)
    section.header_distance = Cm(0.7)
    section.footer_distance = Cm(0.4)

    # Asegurar código de calidad oficial F-PR-EAO-03 R01 en pie de página
    for s in doc.sections:
        for t_elem in s.footer._element.xpath('.//w:t'):
            if t_elem.text == '2':
                prev = t_elem.getprevious()
                if prev is not None and 'R0' in (prev.text or ''):
                    t_elem.text = '1'
            elif t_elem.text and 'R02' in t_elem.text:
                t_elem.text = t_elem.text.replace('R02', 'R01')

    # Limpiar párrafos vacíos iniciales del cuerpo del documento base
    for p in list(doc.paragraphs):
        p_elem = p._element
        p_elem.getparent().remove(p_elem)
        
    def add_p(text="", bold=False, italic=False, size=11, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=1, space_before=0, font_name="Lato"):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.line_spacing = 1.05
        if text is not None and str(text) != "":
            run = p.add_run(str(text))
            run.bold = bold
            run.italic = italic
            run.font.name = font_name
            run.font.size = Pt(size)
        return p

    def append_run(p, text, bold=False, size=11, font_name="Lato"):
        r = p.add_run(str(text) if text is not None else "")
        r.font.name = font_name
        r.font.size = Pt(size)
        r.bold = bold
        return r

    # Folio en la esquina derecha
    folio = str(data.get("folio", "DIMC-CC-2026-001"))
    add_p(f"Folio: {folio}", bold=True, size=9.5, align=WD_ALIGN_PARAGRAPH.RIGHT, space_after=1)

    tipo = str(data.get("tipoMovimiento", "")).strip().lower()
    is_jefe_inmediato = tipo in ["alta", "baja", "cambio de nombre"]
    is_cambio_dep = bool("jerarquica" in tipo or "jerárquica" in tipo)

    t1_nom = str(data.get("titularUnidad1Nombre", "")).strip()
    t1_car = str(data.get("titularUnidad1Cargo", "")).strip()
    t2_nom = str(data.get("titularUnidad2Nombre", "")).strip()
    t2_car = str(data.get("titularUnidad2Cargo", "")).strip()

    if t2_nom.lower() in ["no aplica", "n/a", "na"]:
        is_t2_no_aplica = True
        t2_nom = "No Aplica"
        t2_car = ""
    else:
        is_t2_no_aplica = False

    ta_nom = str(data.get("titularAreaNombre", "")).strip()
    ta_car = str(data.get("titularAreaCargo", "")).strip()
    ta2_nom = str(data.get("titularArea2Nombre", "")).strip()
    ta2_car = str(data.get("titularArea2Cargo", "")).strip()
    tiene_ta2 = bool("jerarquica" in tipo or "jerárquica" in tipo) and bool(ta2_nom or ta2_car)

    w1_nom = str(data.get("testigo1Nombre", "")).strip()
    w1_car = str(data.get("testigo1Cargo", "")).strip()
    w2_nom = str(data.get("testigo2Nombre", "")).strip()
    w2_car = str(data.get("testigo2Cargo", "")).strip()

    # =========================================================================
    # I. DETERMINACIÓN DE LA UNIDAD ADMINISTRATIVA
    # =========================================================================
    add_p("I. DETERMINACIÓN DE LA UNIDAD ADMINISTRATIVA", bold=True, size=11, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0.5, space_after=1)
    add_p("Se determinó la modificación conforme a lo siguiente:", size=10.5, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=1)

    chk_a = "[ X ]" if ("alta" in tipo or data.get("chkAlta") == "[ X ]") else "[   ]"
    chk_b = "[ X ]" if ("baja" in tipo or data.get("chkBaja") == "[ X ]") else "[   ]"
    chk_n = "[ X ]" if ("nombre" in tipo or data.get("chkNombre") == "[ X ]") else "[   ]"
    chk_j = "[ X ]" if ("jerarquica" in tipo or "jerárquica" in tipo or data.get("chkJerarquica") == "[ X ]") else "[   ]"
    
    add_p(f"• Tipo de movimiento:   {chk_a} Alta    {chk_b} Baja    {chk_n} Cambio de nombre    {chk_j} Cambio de dependencia jerárquica", size=10, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=1)
    
    if "nombre" in tipo:
        # Cambio de nombre: Nombre actual y debajo el nuevo nombre que adoptará el área
        nom_act = str(data.get("nombreActual") or data.get("nuevaDenominacion", "")).strip().upper()
        nom_new = str(data.get("nuevoNombre", "")).strip().upper()
        if not nom_new or nom_new == "—":
            if "➔" in nom_act:
                parts = nom_act.split("➔")
                nom_act = parts[0].strip()
                nom_new = parts[1].strip()
            elif "->" in nom_act:
                parts = nom_act.split("->")
                nom_act = parts[0].strip()
                nom_new = parts[1].strip()
            else:
                nom_new = nom_act

        p_act = add_p(size=10.5, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=1)
        append_run(p_act, "• Nombre actual del área o adscripción: ", bold=True, size=10.5)
        append_run(p_act, nom_act, bold=False, size=10.5)

        p_new = add_p(size=10.5, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=1.5)
        append_run(p_new, "• Nuevo nombre del área o adscripción: ", bold=True, size=10.5)
        append_run(p_new, nom_new, bold=False, size=10.5)
    else:
        p_nd = add_p(size=10.5, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=1.5)
        append_run(p_nd, "• Nombre del área o adscripción: ", bold=True, size=10.5)
        append_run(p_nd, str(data.get("nuevaDenominacion", "")).strip().upper(), bold=False, size=10.5)

    # =========================================================================
    # II. GENERALES
    # =========================================================================
    add_p("II. GENERALES", bold=True, size=11, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=1.5, space_after=1)
    
    municipio = str(data.get("municipio", "Mérida"))
    horas = str(data.get("horas", "10"))
    minutos = str(data.get("minutos", "00"))
    dia = str(data.get("dia", "15"))
    mes = str(data.get("mes", "Noviembre"))
    anio = str(data.get("anio", "26"))
    inmueble = str(data.get("inmueble", "el Edificio Central de la Secretaría de Educación"))

    # Extraer de fechaConstancia o fechaActa si no están presentes de forma individual
    fecha_val = str(data.get("fechaConstancia") or data.get("fechaActa") or "").strip()
    if fecha_val and ("-" in fecha_val):
        parts = fecha_val.split("-")
        if len(parts) == 3:
            try:
                y, m, d = parts
                if not data.get("dia"): dia = str(int(d))
                if not data.get("anio"): anio = str(y)[-2:]
                meses_n = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
                m_idx = int(m) - 1
                if 0 <= m_idx < 12 and not data.get("mes"):
                    mes = meses_n[m_idx]
            except Exception:
                pass

    # Párrafo narrativo perfectamente justificado
    p_gen = add_p(align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=1.5)
    append_run(p_gen, "En el municipio de ")
    append_run(p_gen, municipio, bold=True)
    append_run(p_gen, ", del Estado de Yucatán, siendo las ")
    append_run(p_gen, horas, bold=True)
    append_run(p_gen, " horas con ")
    append_run(p_gen, minutos, bold=True)
    append_run(p_gen, " minutos del día ")
    append_run(p_gen, dia, bold=True)
    append_run(p_gen, " del mes de ")
    append_run(p_gen, mes, bold=True)
    anio_full = f"20{anio}" if len(str(anio)) == 2 else str(anio)
    append_run(p_gen, " del año ")
    append_run(p_gen, anio_full, bold=True)
    append_run(p_gen, ", constituidos en el inmueble que ocupa ")
    append_run(p_gen, inmueble, bold=True)
    append_run(p_gen, " ubicada en domicilio conocido, se encuentran reunidos los siguientes representantes de la Secretaría de Educación involucrados:")

    # =========================================================================
    # TABLA DE COMPARECIENTES (DISTRIBUCIÓN EXACTA A 2 COLUMNAS SIN BORDES)
    # =========================================================================
    tbl_comp = doc.add_table(rows=3, cols=2)
    tbl_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_comp.autofit = False

    for r in tbl_comp.rows:
        r.cells[0].width = Inches(2.3)
        r.cells[1].width = Inches(4.3)

    def style_cell_padding(cell, top=0, bottom=1):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(r'<w:tcMar %s><w:top w:w="%d" w:type="dxa"/><w:bottom w:w="%d" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>' % (nsdecls('w'), top, bottom))
        tcPr.append(tcMar)

    # Fila 0: Titular(es) de Unidad / Jefe Inmediato
    c00 = tbl_comp.rows[0].cells[0]
    c01 = tbl_comp.rows[0].cells[1]
    style_cell_padding(c00)
    style_cell_padding(c01)
    
    p00 = c00.paragraphs[0]
    p00.paragraph_format.space_before = Pt(0)
    p00.paragraph_format.space_after = Pt(1)
    p00.paragraph_format.line_spacing = 1.05
    header_titulares = "Titular de Unidad y\nJefe Inmediato:" if is_jefe_inmediato else "Titular(es) de Unidad(es)\nAdministrativa(s):"
    r = p00.add_run(header_titulares)
    r.bold = True
    r.font.name = "Lato"
    r.font.size = Pt(10.5)

    p01 = c01.paragraphs[0]
    p01.paragraph_format.space_before = Pt(0)
    p01.paragraph_format.space_after = Pt(1)
    p01.paragraph_format.line_spacing = 1.05
    t1_txt = f"1) {t1_nom}" + (f" ({t1_car})" if t1_car else "")
    r1 = p01.add_run(t1_txt)
    r1.font.name = "Lato"
    r1.font.size = Pt(10.5)
    r1.bold = False

    if is_jefe_inmediato:
        if t2_nom and t2_nom.lower() != "no aplica":
            t2_txt = f"\nJefe Inmediato: {t2_nom}" + (f" ({t2_car})" if t2_car else "")
            r2 = p01.add_run(t2_txt)
            r2.font.name = "Lato"
            r2.font.size = Pt(10.5)
            r2.bold = False
    elif is_t2_no_aplica:
        t2_txt = f"\n2) No Aplica"
        r2 = p01.add_run(t2_txt)
        r2.font.name = "Lato"
        r2.font.size = Pt(10.5)
        r2.bold = False
    elif t2_nom:
        t2_txt = f"\n2) {t2_nom}" + (f" ({t2_car})" if t2_car else "")
        r2 = p01.add_run(t2_txt)
        r2.font.name = "Lato"
        r2.font.size = Pt(10.5)
        r2.bold = False

    # Fila 1: Titular(es) de Área
    c10 = tbl_comp.rows[1].cells[0]
    c11 = tbl_comp.rows[1].cells[1]
    style_cell_padding(c10)
    style_cell_padding(c11)

    p10 = c10.paragraphs[0]
    p10.paragraph_format.space_before = Pt(0)
    p10.paragraph_format.space_after = Pt(1)
    p10.paragraph_format.line_spacing = 1.05
    header_ta = "Titular(es) de Área:" if tiene_ta2 else "Titular de Área:"
    r = p10.add_run(header_ta)
    r.bold = True
    r.font.name = "Lato"
    r.font.size = Pt(10.5)

    p11 = c11.paragraphs[0]
    p11.paragraph_format.space_before = Pt(0)
    p11.paragraph_format.space_after = Pt(1)
    p11.paragraph_format.line_spacing = 1.05
    if tiene_ta2:
        ta1_line = f"1) {ta_nom}" + (f" ({ta_car})" if ta_car else "")
        ta2_line = f"2) {ta2_nom}" + (f" ({ta2_car})" if ta2_car else "")
        r1 = p11.add_run(f"{ta1_line}\n")
        r1.font.name = "Lato"
        r1.font.size = Pt(10.5)
        r1.bold = False
        r2 = p11.add_run(ta2_line)
        r2.font.name = "Lato"
        r2.font.size = Pt(10.5)
        r2.bold = False
    else:
        ta_txt = f"{ta_nom}" + (f" ({ta_car})" if ta_car else "")
        r = p11.add_run(ta_txt)
        r.font.name = "Lato"
        r.font.size = Pt(10.5)
        r.bold = False

    # Fila 2: Testigos
    c20 = tbl_comp.rows[2].cells[0]
    c21 = tbl_comp.rows[2].cells[1]
    style_cell_padding(c20)
    style_cell_padding(c21)

    p20 = c20.paragraphs[0]
    p20.paragraph_format.space_before = Pt(0)
    p20.paragraph_format.space_after = Pt(1)
    p20.paragraph_format.line_spacing = 1.05
    r = p20.add_run("Testigo:" if is_cambio_dep else "Testigos:")
    r.bold = True
    r.font.name = "Lato"
    r.font.size = Pt(10.5)

    p21 = c21.paragraphs[0]
    p21.paragraph_format.space_before = Pt(0)
    p21.paragraph_format.space_after = Pt(1)
    p21.paragraph_format.line_spacing = 1.05
    w1_txt = f"1) {w1_nom}" + (f" ({w1_car})" if w1_car else "")
    r = p21.add_run(w1_txt)
    r.font.name = "Lato"
    r.font.size = Pt(10.5)
    r.bold = False
    if not is_cambio_dep and w2_nom:
        w2_txt = f"\n2) {w2_nom}" + (f" ({w2_car})" if w2_car else "")
        r = p21.add_run(w2_txt)
        r.font.name = "Lato"
        r.font.size = Pt(10.5)
        r.bold = False

    # =========================================================================
    # III. JUSTIFICACIÓN Y MOTIVOS DEL CAMBIO
    # =========================================================================
    add_p("III. JUSTIFICACIÓN Y MOTIVOS DEL CAMBIO", bold=True, size=11, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=1.5, space_after=1)
    
    add_p("Se hace constar los siguientes hechos y circunstancias de carácter administrativo…", size=10.5, italic=True, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=1)
    
    just_txt = str(data.get("justificacion", "")).strip()
    if just_txt.startswith("Se hace constar"):
        # Si ya viene con el prefijo, removerlo para evitar que aparezca duplicado
        idx = just_txt.find(":")
        if idx != -1:
            just_txt = just_txt[idx+1:].strip()
        else:
            just_txt = just_txt.replace("Se hace constar los siguientes hechos y circunstancias de carácter administrativo…", "").replace("Se hace constar los siguientes hechos y circunstancias de carácter administrativo", "").strip()
    
    add_p(just_txt.upper(), size=10.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=1.5)

    # =========================================================================
    # IV. CIERRE
    # =========================================================================
    add_p("IV. CIERRE", bold=True, size=11, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=1.5, space_after=1)
    add_p("Una vez expresado lo anterior y al no haber más hechos que hacer constar, se da por concluida la presente, firmando al calce para su debida constancia y manifestando su entera conformidad los involucrados, siendo el mismo día y año.", size=10.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=2)

    # =========================================================================
    # BLOQUE DE FIRMAS CON LÍNEAS SÓLIDAS CONTINUAS (BORDES NATIVOS DE TABLA)
    # =========================================================================
    def set_sig_cell_solid(cell, title, name, cargo, has_border=True):
        tcPr = cell._tc.get_or_add_tcPr()
        if has_border:
            tcBorders = parse_xml(r'<w:tcBorders %s><w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>' % nsdecls('w'))
            tcPr.append(tcBorders)
        else:
            tcBorders = parse_xml(r'<w:tcBorders %s><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>' % nsdecls('w'))
            tcPr.append(tcBorders)

        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(0.5)
        p.paragraph_format.line_spacing = 1.0

        if title:
            r_tit = p.add_run(f"{title}\n")
            r_tit.bold = True
            r_tit.font.name = "Lato"
            r_tit.font.size = Pt(8.5)

        is_no_aplica = str(name).strip().lower() in ["no aplica", "n/a", "na"]
        if name:
            r_nom = p.add_run(f"{name}\n" if (cargo and not is_no_aplica) else f"{name}")
            r_nom.bold = True
            r_nom.font.name = "Lato"
            r_nom.font.size = Pt(8.5)

        if cargo and not is_no_aplica:
            r_car = p.add_run(str(cargo))
            r_car.font.name = "Lato"
            r_car.font.size = Pt(7.5)
            r_car.font.color.rgb = RGBColor(100, 100, 100)

    def add_spacer(space_pt=20):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_pt)
        p.paragraph_format.line_spacing = Pt(1)
        return p

    # Espacio razonable para firmas 1
    add_spacer(14 if tiene_ta2 else 20)

    # Fila 1: Titulares / Jefe Inmediato (Líneas continuas sólidas)
    t2_header_sig = "JEFE INMEDIATO" if is_jefe_inmediato else "TITULAR DE UNIDAD ADMINISTRATIVA (2)"
    if is_t2_no_aplica or t2_nom:
        t1 = doc.add_table(rows=1, cols=3)
        t1.alignment = WD_TABLE_ALIGNMENT.CENTER
        t1.rows[0].cells[0].width = Inches(3.0)
        t1.rows[0].cells[1].width = Inches(0.6)
        t1.rows[0].cells[2].width = Inches(3.0)
        set_sig_cell_solid(t1.rows[0].cells[0], "TITULAR DE UNIDAD ADMINISTRATIVA (1)", t1_nom, t1_car, has_border=True)
        set_sig_cell_solid(t1.rows[0].cells[1], "", "", "", has_border=False)
        set_sig_cell_solid(t1.rows[0].cells[2], t2_header_sig, "No Aplica" if is_t2_no_aplica else t2_nom, "" if is_t2_no_aplica else t2_car, has_border=True)
    else:
        t1 = doc.add_table(rows=1, cols=3)
        t1.alignment = WD_TABLE_ALIGNMENT.CENTER
        t1.rows[0].cells[0].width = Inches(1.8)
        t1.rows[0].cells[1].width = Inches(3.0)
        t1.rows[0].cells[2].width = Inches(1.8)
        set_sig_cell_solid(t1.rows[0].cells[0], "", "", "", has_border=False)
        set_sig_cell_solid(t1.rows[0].cells[1], "TITULAR DE UNIDAD ADMINISTRATIVA", t1_nom, t1_car, has_border=True)
        set_sig_cell_solid(t1.rows[0].cells[2], "", "", "", has_border=False)

    if is_cambio_dep:
        # Para Cambio de Dependencia Jerárquica: Se quita la firma de en medio.
        # El Testigo (1) se vuelve Titular de Área y el testigo (2) se vuelve Testigo (1)
        add_spacer(20)
        t3 = doc.add_table(rows=1, cols=3)
        t3.alignment = WD_TABLE_ALIGNMENT.CENTER
        t3.rows[0].cells[0].width = Inches(3.0)
        t3.rows[0].cells[1].width = Inches(0.6)
        t3.rows[0].cells[2].width = Inches(3.0)
        set_sig_cell_solid(t3.rows[0].cells[0], "TITULAR DE ÁREA", ta_nom, ta_car, has_border=True)
        set_sig_cell_solid(t3.rows[0].cells[1], "", "", "", has_border=False)
        set_sig_cell_solid(t3.rows[0].cells[2], "TESTIGO (1)", w1_nom, w1_car, has_border=True)
    else:
        # Fila 2: Titular de Área al centro
        add_spacer(16)
        t2 = doc.add_table(rows=1, cols=3)
        t2.alignment = WD_TABLE_ALIGNMENT.CENTER
        t2.rows[0].cells[0].width = Inches(1.8)
        t2.rows[0].cells[1].width = Inches(3.0)
        t2.rows[0].cells[2].width = Inches(1.8)
        set_sig_cell_solid(t2.rows[0].cells[0], "", "", "", has_border=False)
        set_sig_cell_solid(t2.rows[0].cells[1], "TITULAR DE ÁREA", ta_nom, ta_car, has_border=True)
        set_sig_cell_solid(t2.rows[0].cells[2], "", "", "", has_border=False)

        # Fila 3: Testigos 1 y 2
        add_spacer(16)
        if w2_nom:
            t3 = doc.add_table(rows=1, cols=3)
            t3.alignment = WD_TABLE_ALIGNMENT.CENTER
            t3.rows[0].cells[0].width = Inches(3.0)
            t3.rows[0].cells[1].width = Inches(0.6)
            t3.rows[0].cells[2].width = Inches(3.0)
            set_sig_cell_solid(t3.rows[0].cells[0], "TESTIGO (1)", w1_nom, w1_car, has_border=True)
            set_sig_cell_solid(t3.rows[0].cells[1], "", "", "", has_border=False)
            set_sig_cell_solid(t3.rows[0].cells[2], "TESTIGO (2)", w2_nom, w2_car, has_border=True)
        else:
            t3 = doc.add_table(rows=1, cols=3)
            t3.alignment = WD_TABLE_ALIGNMENT.CENTER
            t3.rows[0].cells[0].width = Inches(1.8)
            t3.rows[0].cells[1].width = Inches(3.0)
            t3.rows[0].cells[2].width = Inches(1.8)
            set_sig_cell_solid(t3.rows[0].cells[0], "", "", "", has_border=False)
            set_sig_cell_solid(t3.rows[0].cells[1], "TESTIGO", w1_nom, w1_car, has_border=True)
            set_sig_cell_solid(t3.rows[0].cells[2], "", "", "", has_border=False)

    doc.save(output_path)
    return output_path
