/**
 * CÓDIGO PARA GOOGLE APPS SCRIPT (Google Sheets) - SISTEMA SEGEY
 * ==============================================================
 * Incluye:
 * 1. doPost: Recepción de constancias y envío de avisos por correo institucional.
 * 2. doGet: Sincronización bidireccional (descarga de folios y catálogo para la web).
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Bitácora Constancias") || ss.getActiveSheet();
    
    // Si la hoja está vacía, crear los 19 encabezados oficiales
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Folio",
        "Fecha Registro",
        "Área Notificadora",
        "Responsable de Captura",
        "Municipio",
        "Fecha de constancia",
        "Hora",
        "Inmueble",
        "Tipo de Movimiento",
        "Nueva Denominación",
        "Justificación y Motivos",
        "Titular de Unidad Administrativa (1)",
        "Jefe Inmediato",
        "Titular de Unidad Administrativa (2)",
        "Titular de Área",
        "Testigo (1)",
        "Testigo (2)",
        "Estatus",
        "Observaciones"
      ]);
      
      var headerRange = sheet.getRange(1, 1, 1, 19);
      headerRange.setBackground("#0e3b43");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    // Leer los datos enviados desde la aplicación web
    var data = JSON.parse(e.postData.contents);
    
    // Lógica dinámica de firmas según el Apartado I
    var esCambioJerarquico = (data.tipoMovimiento === 'Cambio de dependencia jerárquica');
    var jefeInmediato = data.jefeInmediato || (!esCambioJerarquico ? (data.titularUnidad2 || "") : "");
    var titularUnidad2 = esCambioJerarquico ? (data.titularUnidad2 || "") : "";
    var testigo2 = esCambioJerarquico ? "" : (data.testigo2 || "");
    
    var fechaRegistroStr = new Date().toLocaleString("es-MX");

    sheet.appendRow([
      data.folio || "",
      fechaRegistroStr,
      data.areaNotificadora || "",
      data.responsableCaptura || "",
      data.municipio || "",
      data.fechaActa || "",
      data.horaActa || "",
      data.inmueble || "",
      data.tipoMovimiento || "",
      data.nuevaDenominacion || "",
      data.justificacion || "",
      data.titularUnidad1 || "",
      jefeInmediato || "",
      titularUnidad2 || "",
      data.titularArea || "",
      data.testigo1 || "",
      testigo2 || "",
      data.estatus || "Generada para Firma",
      data.observaciones || ""
    ]);

    // =========================================================================
    // NOTIFICACIÓN AUTOMÁTICA POR CORREO INSTITUCIONAL
    // =========================================================================
    var destinatarios = data.correosNotificacion || "";
    if (destinatarios && destinatarios.trim() !== "") {
      try {
        var esModif = (data.estatus === "Modificación");
        var asunto = esModif 
          ? "⚠️ [SEGEY] Modificación de Constancia: " + data.folio + " (" + (data.areaNotificadora || "General") + ")"
          : "📄 [SEGEY] Nueva Constancia Generada: " + data.folio + " (" + (data.areaNotificadora || "General") + ")";
        
        var cuerpoHtml = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">' +
          '<div style="background-color: #0e3b43; color: white; padding: 20px; text-align: center;">' +
            '<h2 style="margin: 0; font-size: 17px;">Secretaría de Educación del Gobierno del Estado de Yucatán</h2>' +
            '<p style="margin: 5px 0 0; font-size: 12px; color: #cbd5e1;">Departamento de Innovación y Mejora Continua</p>' +
          '</div>' +
          '<div style="padding: 24px; color: #1e293b; line-height: 1.6; font-size: 13px;">' +
            '<p style="font-size: 15px; font-weight: bold; color: #0e3b43; margin-top: 0;">' +
              (esModif ? '⚠️ Se ha registrado una modificación en una constancia' : '✅ Se ha registrado un nuevo folio oficial de constancia') +
            '</p>' +
            '<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 40%;">Folio Oficial:</td><td style="padding: 6px 0; font-weight: bold; color: #0e3b43;">' + (data.folio || '') + '</td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Estatus:</td><td style="padding: 6px 0;"><span style="background: ' + (esModif ? '#fef3c7' : '#ecfdf5') + '; color: ' + (esModif ? '#92400e' : '#065f46') + '; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 11px;">' + (data.estatus || 'Generada para Firma') + '</span></td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Área Notificadora:</td><td style="padding: 6px 0;">' + (data.areaNotificadora || 'No especificada') + '</td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Responsable:</td><td style="padding: 6px 0;">' + (data.responsableCaptura || 'Capturista') + '</td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Tipo de Movimiento:</td><td style="padding: 6px 0; font-weight: bold;">' + (data.tipoMovimiento || '') + '</td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Denominación:</td><td style="padding: 6px 0;">' + (data.nuevaDenominacion || '') + '</td></tr>' +
              '<tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Fecha del Registro:</td><td style="padding: 6px 0;">' + fechaRegistroStr + '</td></tr>' +
            '</table>' +
            (data.observaciones ? '<div style="background: #f8fafc; border-left: 3px solid #0e3b43; padding: 10px; margin: 12px 0; font-style: italic;">Observaciones: "' + data.observaciones + '"</div>' : '') +
            '<div style="margin-top: 22px; text-align: center;">' +
              '<a href="https://segey-dimc.github.io/constancias-segey/" style="background: #0e3b43; color: white; padding: 10px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 12px; display: inline-block;">Abrir Plataforma en Línea</a>' +
            '</div>' +
          '</div>' +
          '<div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8;">' +
            'Aviso automático institucional emitido por el Sistema de Constancias de Cambios - SEGEY.' +
          '</div>' +
        '</div>';

        MailApp.sendEmail({
          to: destinatarios,
          subject: asunto,
          htmlBody: cuerpoHtml
        });
      } catch (mailErr) {
        console.error("Error al enviar notificación por correo:", mailErr);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Registro guardado correctamente",
      folio: data.folio
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =============================================================================
// doGet: LECTURA Y SINCRONIZACIÓN CENTRALIZADA CON LA WEB
// =============================================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getRecords";

    // Acción 1: Obtener todos los registros de la bitácora
    if (action === "getRecords") {
      var sheet = ss.getSheetByName("Bitácora Constancias") || ss.getActiveSheet();
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          records: []
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var records = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[0]) continue; // ignorar renglones vacíos
        records.push({
          folio: String(row[0]),
          fechaRegistro: row[1] ? String(row[1]) : "",
          areaNotificadora: row[2] ? String(row[2]) : "",
          responsableCaptura: row[3] ? String(row[3]) : "",
          municipio: row[4] ? String(row[4]) : "Mérida",
          fechaActa: row[5] ? String(row[5]) : "",
          horaActa: row[6] ? String(row[6]) : "",
          inmueble: row[7] ? String(row[7]) : "",
          tipoMovimiento: row[8] ? String(row[8]) : "Alta",
          nuevaDenominacion: row[9] ? String(row[9]) : "",
          justificacion: row[10] ? String(row[10]) : "",
          titularUnidad1: row[11] ? String(row[11]) : "",
          jefeInmediato: row[12] ? String(row[12]) : "",
          titularUnidad2: row[13] ? String(row[13]) : "",
          titularArea: row[14] ? String(row[14]) : "",
          testigo1: row[15] ? String(row[15]) : "",
          testigo2: row[16] ? String(row[16]) : "",
          estatus: row[17] ? String(row[17]) : "Generada para Firma",
          observaciones: row[18] ? String(row[18]) : ""
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        total: records.length,
        records: records
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Acción 2: Obtener catálogo dinámico de funcionarios y puestos desde Google Sheets
    if (action === "getCatalogo") {
      var sheetCat = ss.getSheetByName("Catálogo Funcionarios");
      if (!sheetCat) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "not_found",
          message: "Hoja 'Catálogo Funcionarios' no encontrada.",
          catalogo: []
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var catData = sheetCat.getDataRange().getValues();
      var catalogo = [];
      for (var j = 1; j < catData.length; j++) {
        var cRow = catData[j];
        if (cRow[0]) {
          catalogo.push({
            area: String(cRow[0]),
            cargo: cRow[1] ? String(cRow[1]) : "",
            titular: cRow[2] ? String(cRow[2]) : "",
            jefe: cRow[3] ? String(cRow[3]) : ""
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        catalogo: catalogo
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Servicio Webhook de Constancias SEGEY activo y en línea."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
