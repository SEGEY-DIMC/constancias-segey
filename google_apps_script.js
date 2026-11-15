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
 * 4. Haz clic en el botón azul "Implementar" (arriba a la derecha) > "Gestionar implementaciones" (o "Nueva implementación").
 * 5. Selecciona Tipo: "Aplicación web".
 *    - Descripción: "Webhook Constancias SEGEY"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier persona" (Anyone)
 * 6. Haz clic en "Implementar", autoriza los permisos y copia la URL.
 * 
 * ¡Listo! Cada vez que alguien guarde una constancia en la web, se agregará un renglón nuevo aquí.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Si la hoja está vacía, crear encabezados oficiales actualizados (19 columnas)
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
      
      // Dar formato a encabezados
      var headerRange = sheet.getRange(1, 1, 1, 19);
      headerRange.setBackground("#0e3b43");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    // Leer los datos enviados desde la aplicación web
    var data = JSON.parse(e.postData.contents);
    
    // Lógica dinámica de firmas según el trámite del Apartado I:
    // - En "Cambio de dependencia jerárquica": Hay 2 Titulares de Unidad, 1 Titular de Área y 1 Testigo (no hay Jefe Inmediato ni Testigo 2).
    // - En los demás trámites: Hay Titular de Unidad (1), Jefe Inmediato, Titular de Área, Testigo (1) y Testigo (2).
    var esCambioJerarquico = (data.tipoMovimiento === 'Cambio de dependencia jerárquica');
    var jefeInmediato = data.jefeInmediato || (!esCambioJerarquico ? (data.titularUnidad2 || "") : "");
    var titularUnidad2 = esCambioJerarquico ? (data.titularUnidad2 || "") : "";
    var testigo2 = esCambioJerarquico ? "" : (data.testigo2 || "");
    
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
      jefeInmediato || "",
      titularUnidad2 || "",
      data.titularArea || "",
      data.testigo1 || "",
      testigo2 || "",
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
