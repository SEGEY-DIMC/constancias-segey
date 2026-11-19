/**
 * CÓDIGO PARA GOOGLE APPS SCRIPT (Google Sheets) - SISTEMA SEGEY
 * ==============================================================
 * Incluye:
 * 1. Base de Datos de Usuarios Privada y Segura (Data Isolation).
 * 2. Autenticación con Hash SHA-256 en Servidor y Control de Intentos Fallidos.
 * 3. doPost: Login Seguro, Carga de Expediente Firmado a Drive y Registro de Constancias.
 * 4. doGet: Sincronización de Constancias y Catálogos (Hoja de usuarios 100% aislada e invisible).
 */

// =============================================================================
// CONFIGURACIÓN INSTITUCIONAL Y ENLACE A HOJA PRIVADA DE USUARIOS
// =============================================================================
var USERS_SPREADSHEET_ID = "1XrHE-MoNfZqbbAODjXyEWSNStIHWd_C6tH7L81bLfDc";

// Enlace oficial a la hoja maestra de Catálogo de Funcionarios y Puestos
var CATALOGO_SPREADSHEET_ID = "1mhJMtK_3-S1YzBzqkEq5C-nzumCba5_KHWRPmH_uZRA";

// Token secreto para proteger la consulta de la bitácora de folios (getRecords)
var BITACORA_API_TOKEN = "DIMC_SEGEY_2026_x89aF49bQ2wL";

/**
 * Calcula el Hash criptográfico SHA-256 en minúsculas estándar.
 */
function computeSHA256(text) {
  if (!text) return "";
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  var txtHash = "";
  for (var j = 0; j < rawHash.length; j++) {
    var hashVal = rawHash[j];
    if (hashVal < 0) hashVal += 256;
    var byteString = hashVal.toString(16);
    if (byteString.length === 1) byteString = "0" + byteString;
    txtHash += byteString;
  }
  return txtHash.toLowerCase();
}

/**
 * Sanitiza valores de texto para evitar inyecciones de fórmulas en Google Sheets.
 */
function sanitizeForSheets(val) {
  if (typeof val !== "string") return val;
  var trimmed = val.trim();
  var firstChar = trimmed.charAt(0);
  if (firstChar === "=" || firstChar === "+" || firstChar === "-" || firstChar === "@") {
    return "'" + val;
  }
  return val;
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Bitácora Constancias") || ss.getSheetByName("Registros") || ss.getSheets()[0];
    
    // Si la hoja principal de constancias está vacía, crear los 20 encabezados oficiales
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
        "Observaciones",
        "Expediente Firmado"
      ]);
      
      var headerRange = sheet.getRange(1, 1, 1, 20);
      headerRange.setBackground("#8B1D41");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    // Leer los datos enviados desde la aplicación web
    var data = JSON.parse(e.postData.contents);

    // =========================================================================
    // ACCIÓN 1: AUTENTICACIÓN SEGURA CON HOJA PRIVADA DE USUARIOS
    // =========================================================================
    if (data.action === "login") {
      var username = String(data.username || "").trim().toLowerCase();
      var password = String(data.password || "").trim();
      var clientHash = String(data.passwordHash || "").trim().toLowerCase();

      if (!username || (!password && !clientHash)) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Debe ingresar usuario y contraseña."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var ssUsers;
      try {
        ssUsers = SpreadsheetApp.openById(USERS_SPREADSHEET_ID);
      } catch (errOpen) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Error al acceder a la base de usuarios privada: " + errOpen.message
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var sheetUsers = ssUsers.getSheetByName("Usuarios Autorizados") || ssUsers.getSheets()[0];
      var usersData = sheetUsers.getDataRange().getValues();
      var userFound = false;

      for (var u = 1; u < usersData.length; u++) {
        var rowUser = String(usersData[u][0] || "").trim().toLowerCase();
        if (rowUser === username) {
          userFound = true;
          var estatus = String(usersData[u][6] || "Activo").trim();
          if (estatus.toLowerCase() === "inactivo") {
            return ContentService.createTextOutput(JSON.stringify({
              status: "error",
              message: "Esta cuenta se encuentra INACTIVA. Comuníquese con la administración del Departamento de Innovación y Mejora Continua."
            })).setMimeType(ContentService.MimeType.JSON);
          }

          var storedPass = String(usersData[u][5] || "").trim();
          var plainRefPass = usersData[u].length > 10 ? String(usersData[u][10] || "").trim() : "";
          var computedServerHash = password ? computeSHA256(password) : "";
          var isMatch = false;

          // 1. Coincide con el hash calculado en el servidor
          if (computedServerHash && storedPass.toLowerCase() === computedServerHash) {
            isMatch = true;
          }
          // 2. Coincide con el hash enviado por el cliente
          else if (clientHash && storedPass.toLowerCase() === clientHash) {
            isMatch = true;
          }
          // 3. O el administrador escribió la contraseña en texto plano en la columna F:
          //    La valida, la encripta inmediatamente en columna F y respalda en columna K
          else if (password && storedPass === password) {
            isMatch = true;
            sheetUsers.getRange(u + 1, 6).setValue(computedServerHash);
            sheetUsers.getRange(u + 1, 11).setValue(password);
          }
          // 4. O el administrador actualizó la contraseña en texto plano en la columna K:
          else if (password && plainRefPass && plainRefPass === password) {
            isMatch = true;
            sheetUsers.getRange(u + 1, 6).setValue(computedServerHash);
          }

          if (isMatch) {
            var nowStr = Utilities.formatDate(new Date(), "America/Merida", "yyyy-MM-dd HH:mm:ss");
            sheetUsers.getRange(u + 1, 8).setValue(nowStr);
            sheetUsers.getRange(u + 1, 9).setValue(0);

            var tokenPayload = username + ":" + (usersData[u][3] || "Administrador") + ":" + Date.now();
            var sessionToken = Utilities.base64Encode(tokenPayload);

            return ContentService.createTextOutput(JSON.stringify({
              status: "success",
              message: "Acceso autorizado.",
              token: sessionToken,
              apiToken: BITACORA_API_TOKEN,
              user: {
                username: rowUser,
                nombre: String(usersData[u][1] || rowUser),
                correo: String(usersData[u][2] || ""),
                rol: String(usersData[u][3] || "Administrador"),
                area: String(usersData[u][4] || ""),
                token: sessionToken,
                ultimoAcceso: nowStr
              }
            })).setMimeType(ContentService.MimeType.JSON);
          } else {
            var failedAttempts = Number(usersData[u][8] || 0) + 1;
            sheetUsers.getRange(u + 1, 9).setValue(failedAttempts);

            if (failedAttempts >= 5) {
              sheetUsers.getRange(u + 1, 7).setValue("Inactivo");
              return ContentService.createTextOutput(JSON.stringify({
                status: "error",
                message: "Cuenta bloqueada por seguridad tras 5 intentos fallidos consecutivos. Contacte a la DIMC."
              })).setMimeType(ContentService.MimeType.JSON);
            }

            return ContentService.createTextOutput(JSON.stringify({
              status: "error",
              message: "Contraseña incorrecta. Intento fallido " + failedAttempts + " de 5."
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }

      if (!userFound) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "El usuario ingresado no existe en el registro oficial de la SEGEY."
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // =========================================================================
    // ACCIÓN 2: CAMBIO DE CONTRASEÑA EN LA HOJA PRIVADA
    // =========================================================================
    if (data.action === "changePassword") {
      var chUser = String(data.username || "").trim().toLowerCase();
      var oldPass = String(data.oldPassword || "").trim();
      var newPass = String(data.newPassword || "").trim();

      if (!chUser || !oldPass || !newPass) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Todos los campos son obligatorios."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var ssUsers2 = SpreadsheetApp.openById(USERS_SPREADSHEET_ID);
      var sheetUsers2 = ssUsers2.getSheetByName("Usuarios Autorizados") || ssUsers2.getSheets()[0];
      var usersData2 = sheetUsers2.getDataRange().getValues();

      for (var v = 1; v < usersData2.length; v++) {
        var uName = String(usersData2[v][0] || "").trim().toLowerCase();
        if (uName === chUser) {
          var curPass = String(usersData2[v][5] || "").trim();
          var oHash = computeSHA256(oldPass);
          if (curPass.toLowerCase() === oHash || curPass === oldPass) {
            var nHash = computeSHA256(newPass);
            sheetUsers2.getRange(v + 1, 6).setValue(nHash);
            sheetUsers2.getRange(v + 1, 11).setValue(newPass);
            return ContentService.createTextOutput(JSON.stringify({
              status: "success",
              message: "Contraseña actualizada exitosamente."
            })).setMimeType(ContentService.MimeType.JSON);
          } else {
            return ContentService.createTextOutput(JSON.stringify({
              status: "error",
              message: "La contraseña anterior es incorrecta."
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Usuario no encontrado."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACCIÓN 3: SUBIR EXPEDIENTE ESCANEADO / FOTO A GOOGLE DRIVE
    // =========================================================================
    if (data.action === "uploadExpediente") {
      var folioBuscado = String(data.folio || "").trim();
      if (!folioBuscado || !data.base64) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Faltan datos obligatorios (folio o archivo base64)."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // 1. Obtener o crear carpeta en Google Drive "Constancias Firmadas DIMC"
      var folder;
      var folders = DriveApp.getFoldersByName("Constancias Firmadas DIMC");
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("Constancias Firmadas DIMC");
      }

      // 2. Decodificar archivo y guardarlo en Google Drive
      var mimeType = data.mimeType || "application/pdf";
      var ext = mimeType.indexOf("pdf") !== -1 ? ".pdf" : ".jpg";
      var fileName = data.fileName || ("Constancia_" + folioBuscado + "_firmada" + ext);
      var decodedBytes = Utilities.base64Decode(data.base64);
      var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
      var driveFile = folder.createFile(blob);
      try {
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {}
      var fileUrl = driveFile.getUrl();

      // 3. Vincular URL en la columna 20 (Expediente Firmado) de la hoja
      var allRows = sheet.getDataRange().getValues();
      var folioFound = false;
      if (allRows.length > 0 && allRows[0].length < 20) {
        sheet.getRange(1, 20).setValue("Expediente Firmado");
        sheet.getRange(1, 20).setBackground("#8B1D41").setFontColor("#ffffff").setFontWeight("bold");
      }
      for (var r = 1; r < allRows.length; r++) {
        if (String(allRows[r][0]).trim().toUpperCase() === folioBuscado.toUpperCase()) {
          sheet.getRange(r + 1, 20).setValue(fileUrl);
          if (data.actualizarEstatus) {
            sheet.getRange(r + 1, 18).setValue("Firmada y Concluida");
          }
          folioFound = true;
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        fileUrl: fileUrl,
        fileId: driveFile.getId(),
        fileName: fileName,
        folio: folioBuscado,
        message: "Expediente digital guardado en Google Drive exitosamente."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // =========================================================================
    // ACCIÓN 4: REGISTRO O EDICIÓN DE CONSTANCIAS OFICIALES
    // =========================================================================
    var esCambioJerarquico = (data.tipoMovimiento === 'Cambio de dependencia jerárquica');
    var jefeInmediato = data.jefeInmediato || (!esCambioJerarquico ? (data.titularUnidad2 || "") : "");
    var titularUnidad2 = esCambioJerarquico ? (data.titularUnidad2 || "") : "";
    var testigo2 = esCambioJerarquico ? (data.testigo2 || "") : "";
    
    var fechaRegistroStr = new Date().toLocaleString("es-MX");
    var folioBuscado = String(data.folio || "").trim();
    var allRows = sheet.getDataRange().getValues();
    var rowIndexToUpdate = -1;
    for (var r = 1; r < allRows.length; r++) {
      if (folioBuscado && String(allRows[r][0]).trim().toUpperCase() === folioBuscado.toUpperCase()) {
        rowIndexToUpdate = r + 1;
        break;
      }
    }

    var rowValues = [
      sanitizeForSheets(data.folio || ""),
      rowIndexToUpdate !== -1 ? (allRows[rowIndexToUpdate - 1][1] || fechaRegistroStr) : fechaRegistroStr,
      sanitizeForSheets(data.areaNotificadora || ""),
      sanitizeForSheets(data.responsableCaptura || ""),
      sanitizeForSheets(data.municipio || "Mérida"),
      sanitizeForSheets(data.fechaActa || ""),
      sanitizeForSheets(data.horaActa || ""),
      sanitizeForSheets(data.inmueble || ""),
      sanitizeForSheets(data.tipoMovimiento || ""),
      sanitizeForSheets(data.nuevaDenominacion || ""),
      sanitizeForSheets(data.justificacion || ""),
      sanitizeForSheets(data.titularUnidad1 || ""),
      sanitizeForSheets(jefeInmediato || ""),
      sanitizeForSheets(titularUnidad2 || ""),
      sanitizeForSheets(data.titularArea || ""),
      sanitizeForSheets(data.testigo1 || ""),
      sanitizeForSheets(testigo2 || ""),
      sanitizeForSheets(data.estatus || "Generada para Firma"),
      sanitizeForSheets(data.observaciones || ""),
      data.expedienteUrl || (rowIndexToUpdate !== -1 ? (allRows[rowIndexToUpdate - 1][19] || "") : "")
    ];

    if (rowIndexToUpdate !== -1) {
      sheet.getRange(rowIndexToUpdate, 1, 1, 20).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

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
          '<div style="background-color: #8B1D41; color: white; padding: 20px; text-align: center;">' +
            '<h2 style="margin: 0; font-size: 17px;">Secretaría de Educación del Gobierno del Estado de Yucatán</h2>' +
            '<p style="margin: 5px 0 0; font-size: 12px; color: #fce7f3;">Departamento de Innovación y Mejora Continua</p>' +
          '</div>' +
          '<div style="padding: 24px; color: #1e293b; line-height: 1.6; font-size: 13px;">' +
            '<p style="font-size: 15px; font-weight: bold; color: #8B1D41; margin-top: 0;">' +
              (esModif ? '⚠️ Se ha registrado una modificación en una constancia' : '✅ Se ha registrado un nuevo folio oficial de constancia') +
            '</p>' +
            '<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 40%;">Folio Oficial:</td><td style="padding: 6px 0; font-weight: bold; color: #8B1D41;">' + (data.folio || '') + '</td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Estatus:</td><td style="padding: 6px 0;"><span style="background: ' + (esModif ? '#fef3c7' : '#ecfdf5') + '; color: ' + (esModif ? '#92400e' : '#065f46') + '; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 11px;">' + (data.estatus || 'Generada para Firma') + '</span></td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Área Notificadora:</td><td style="padding: 6px 0;">' + (data.areaNotificadora || 'No especificada') + '</td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Responsable:</td><td style="padding: 6px 0;">' + (data.responsableCaptura || 'Capturista') + '</td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Tipo de Movimiento:</td><td style="padding: 6px 0; font-weight: bold;">' + (data.tipoMovimiento || '') + '</td></tr>' +
              '<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Denominación:</td><td style="padding: 6px 0;">' + (data.nuevaDenominacion || '') + '</td></tr>' +
              '<tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Fecha del Registro:</td><td style="padding: 6px 0;">' + fechaRegistroStr + '</td></tr>' +
            '</table>' +
            (data.observaciones ? '<div style="background: #f8fafc; border-left: 3px solid #8B1D41; padding: 10px; margin: 12px 0; font-style: italic;">Observaciones: "' + data.observaciones + '"</div>' : '') +
            '<p style="color: #64748b; font-size: 11px; margin-top: 20px;">Este es un aviso automático generado por el Sistema de Constancias de Cambios de la SEGEY.</p>' +
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
// (NOTA DE SEGURIDAD: La hoja de usuarios privada NUNCA se expone en doGet)
// =============================================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getRecords";

    // Acción 1: Obtener todos los registros de la bitácora (PROTEGIDO CON TOKEN DE SEGURIDAD)
    if (action === "getRecords") {
      var clientToken = String(e && e.parameter && e.parameter.token ? e.parameter.token : "").trim();
      var isAuthorized = false;

      // 1. Validar contra el Token Maestro de API
      if (clientToken === BITACORA_API_TOKEN) {
        isAuthorized = true;
      }
      // 2. O validar contra token de sesión generado en login
      else if (clientToken) {
        try {
          var decoded = Utilities.newBlob(Utilities.base64Decode(clientToken)).getDataAsString();
          var parts = decoded.split(":");
          if (parts.length >= 3) {
            var tokenUser = parts[0].toLowerCase();
            var tokenRole = parts[1].toLowerCase();
            // Solo perfiles autorizados pueden consultar bitácora
            if (tokenUser === "admin" || tokenUser === "danny.uh" || tokenUser === "auditoria.segey" ||
                tokenRole.indexOf("admin") !== -1 || tokenRole.indexOf("auditor") !== -1 || tokenRole.indexOf("consulta") !== -1) {
              isAuthorized = true;
            }
          }
        } catch (errToken) {
          isAuthorized = false;
        }
      }

      if (!isAuthorized) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          code: 403,
          message: "Acceso denegado: Se requiere un token de autorización válido para consultar la bitácora de folios."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var sheet = ss.getSheetByName("Bitácora Constancias") || ss.getSheetByName("Registros") || ss.getSheets()[0];
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
          observaciones: row[18] ? String(row[18]) : "",
          expedienteUrl: row[19] ? String(row[19]) : ""
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        total: records.length,
        records: records
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACCIÓN 2: OBTENER CATÁLOGO DE TITULARES Y UNIDADES DESDE GOOGLE SHEETS
    // =========================================================================
    if (action === "getCatalogo") {
      try {
        var ssCat = null;
        try {
          ssCat = SpreadsheetApp.openById(CATALOGO_SPREADSHEET_ID);
        } catch (eOpen) {
          ssCat = ss;
        }

        var sheetTit = ssCat.getSheetByName("Titulares_de_Unidad") || ssCat.getSheetByName("Catálogo Funcionarios") || ss.getSheetByName("Catálogo Funcionarios");
        if (!sheetTit) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "not_found",
            message: "Hoja de Titulares no encontrada en catálogo.",
            catalogo: []
          })).setMimeType(ContentService.MimeType.JSON);
        }

        var catData = sheetTit.getDataRange().getValues();
        var catalogo = [];
        var isOficial = (catData.length > 0 && String(catData[0][1]).indexOf("ID") !== -1);
        for (var j = 1; j < catData.length; j++) {
          var cRow = catData[j];
          if (isOficial) {
            if (cRow[2]) {
              catalogo.push({
                id: cRow[1] ? String(cRow[1]) : "",
                area: String(cRow[2]),
                titular: cRow[3] ? String(cRow[3]) : "",
                cargo: cRow[4] ? String(cRow[4]) : "",
                grupo: cRow[5] ? String(cRow[5]) : ""
              });
            }
          } else {
            if (cRow[0]) {
              catalogo.push({
                area: String(cRow[0]),
                cargo: cRow[1] ? String(cRow[1]) : "",
                titular: cRow[2] ? String(cRow[2]) : "",
                jefe: cRow[3] ? String(cRow[3]) : ""
              });
            }
          }
        }

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          total: catalogo.length,
          catalogo: catalogo
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (errCat) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: errCat.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // =========================================================================
    // ACCIÓN 3: OBTENER ÁREAS Y RESPONSABLES DE CAPTURA DESDE GOOGLE SHEETS
    // =========================================================================
    if (action === "getResponsables") {
      try {
        var ssCat2 = null;
        try {
          ssCat2 = SpreadsheetApp.openById(CATALOGO_SPREADSHEET_ID);
        } catch (eOpen2) {
          ssCat2 = ss;
        }

        // Priorizar el libro maestro Catalogo_Funcionarios_y_Puestos
        var sheetResp = (ssCat2 ? ssCat2.getSheetByName("Responsables_de_Captura") : null) ||
                        (ssCat2 ? ssCat2.getSheetByName("Áreas y Responsables") : null) ||
                        ss.getSheetByName("Responsables_de_Captura") ||
                        ss.getSheetByName("Áreas y Responsables");
        if (!sheetResp) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "not_found",
            message: "Hoja de Responsables no encontrada.",
            responsables: {}
          })).setMimeType(ContentService.MimeType.JSON);
        }

        var rData = sheetResp.getDataRange().getValues();
        var responsables = {};
        var colArea = (rData.length > 0 && String(rData[0][0]).toLowerCase().indexOf("no") !== -1) ? 1 : 0;
        var colResp = colArea === 1 ? 2 : 1;

        for (var k = 1; k < rData.length; k++) {
          var aRow = rData[k];
          if (aRow[colArea]) {
            var rawArea = String(aRow[colArea]).trim();
            var rawResp = aRow[colResp] ? String(aRow[colResp]).trim() : "";
            if (!rawArea || !rawResp) continue;

            // Soporta enlaces múltiples separados por coma, punto y coma o filas repetidas
            var parts = rawResp.split(/[,;\n]+/).map(function(p) { return p.trim(); }).filter(Boolean);
            if (!responsables[rawArea]) {
              responsables[rawArea] = parts.length > 1 ? parts : parts[0];
            } else {
              var existing = Array.isArray(responsables[rawArea]) ? responsables[rawArea] : [responsables[rawArea]];
              for (var pi = 0; pi < parts.length; pi++) {
                if (existing.indexOf(parts[pi]) === -1) {
                  existing.push(parts[pi]);
                }
              }
              responsables[rawArea] = existing.length > 1 ? existing : existing[0];
            }
          }
        }

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          total: Object.keys(responsables).length,
          responsables: responsables
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (errResp) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: errResp.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // =========================================================================
    // ACCIÓN 4: BÚSQUEDA DINÁMICA EN REPORTE DE FUNCIONARIOS (2,929 PUESTOS)
    // =========================================================================
    if (action === "buscarFuncionario") {
      try {
        var query = String(e && e.parameter && e.parameter.q ? e.parameter.q : "").trim().toLowerCase();
        if (!query || query.length < 3) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            results: []
          })).setMimeType(ContentService.MimeType.JSON);
        }

        var ssCat3 = null;
        try {
          ssCat3 = SpreadsheetApp.openById(CATALOGO_SPREADSHEET_ID);
        } catch (eOpen3) {
          ssCat3 = ss;
        }

        var sheetRep = ssCat3.getSheetByName("Reporte_Funcionarios");
        if (!sheetRep) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "not_found",
            message: "Hoja 'Reporte_Funcionarios' no encontrada.",
            results: []
          })).setMimeType(ContentService.MimeType.JSON);
        }

        var repData = sheetRep.getDataRange().getValues();
        var results = [];
        for (var m = 1; m < repData.length; m++) {
          var fRow = repData[m];
          var fNom = String(fRow[2] || "");
          var fPuesto = String(fRow[12] || "");
          var fDir = String(fRow[14] || "");
          var fJefe = String(fRow[7] || "");
          if (fNom.toLowerCase().indexOf(query) !== -1 || fPuesto.toLowerCase().indexOf(query) !== -1 || fDir.toLowerCase().indexOf(query) !== -1) {
            results.push({
              nombre: fNom,
              puesto: fPuesto,
              direccion: fDir,
              jefe: fJefe
            });
            if (results.length >= 25) break;
          }
        }

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          query: query,
          total: results.length,
          results: results
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (errRep) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: errRep.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // =========================================================================
    // ACCIÓN 5: VERIFICACIÓN AUTOMÁTICA DE CAMBIOS EN EL CATÁLOGO (0 SEGUNDOS)
    // =========================================================================
    if (action === "checkCatalogVersion") {
      try {
        var lastUpdated = 0;
        try {
          var catFile = DriveApp.getFileById(CATALOGO_SPREADSHEET_ID);
          lastUpdated = catFile.getLastUpdated().getTime();
        } catch (eDrive) {
          var ssCatFallback = SpreadsheetApp.openById(CATALOGO_SPREADSHEET_ID);
          var sheetTitFallback = ssCatFallback.getSheetByName("Titulares_de_Unidad");
          lastUpdated = sheetTitFallback ? (sheetTitFallback.getLastRow() * 1000) : new Date().getTime();
        }

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          lastUpdated: lastUpdated,
          versionToken: "cat_" + lastUpdated,
          timestamp: new Date().toISOString()
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (errVer) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: errVer.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
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
