/**
 * CÓDIGO PARA GOOGLE APPS SCRIPT (Google Sheets)
 * =============================================
 * Si deseas que cada constancia llenada en línea se guarde automáticamente
 * en una hoja de Google Sheets en tu Google Drive:
 * 
 * INSTRUCCIONES:
 * 1. Entra a Google Drive y crea una Hoja de Cálculo nueva llamada "Bitácora Constancias SEGEY".
 * 2. Ve al menú superior: Extensiones > Apps Script.
 * 3. Borra el código existente y pega todo este código.
 * 4. Haz clic en el botón azul "Implementar" (arriba a la derecha) > "Nueva implementación".
 * 5. Selecciona Tipo: "Aplicación web".
 *    - Descripción: "Webhook Constancias SEGEY"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier persona" (Anyone)
 * 6. Haz clic en "Implementar", autoriza los permisos y COPIA LA "URL DE LA APLICACIÓN WEB".
 * 7. En la herramienta web, ve a la pestaña "Compartir Enlace" > "Conexión con Google Sheets" y pega esa URL.
 * 
 * ¡Listo! Cada vez que alguien guarde una constancia en la web, se agregará un renglón nuevo aquí.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Si la hoja está vacía, crear encabezados oficiales
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
        "Titular Unidad 1",
        "Titular Unidad 2",
        "Titular de Área",
        "Testigo 1",
        "Testigo 2",
        "Estatus",
        "Observaciones"
      ]);
      
      // Dar formato a encabezados
      var headerRange = sheet.getRange(1, 1, 1, 18);
      headerRange.setBackground("#0e3b43");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    // Leer los datos enviados desde la aplicación web
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.folio || "",
      new Date().toLocaleString("es-MX"),
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
      data.titularUnidad2 || "",
      data.titularArea || "",
      data.testigo1 || "",
      data.testigo2 || "",
      data.estatus || "Generada para Firma",
      data.observaciones || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Registro guardado correctamente en Google Sheets",
      folio: data.folio
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Servicio de recepción de Constancias SEGEY activo.");
}
