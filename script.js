const WEBHOOK_URL = "https://angelrodrigo.app.n8n.cloud/webhook/Operacion";

// =======================
// OBTENER IPs DEL CLIENTE
// =======================

// IP pública (usando ipify)
async function getPublicIp() {
  try {
    console.log("[DEBUG] Solicitando IP pública...");
    const r = await fetch('https://api.ipify.org?format=json');
    const j = await r.json();
    console.log("[DEBUG] IP pública obtenida:", j.ip);
    return j.ip;
  } catch (e) {
    console.error("[ERROR] Al obtener IP pública:", e);
    return null;
  }
}

// IP local (WebRTC, puede fallar)
function getLocalIPs(callback) {
  console.log("[DEBUG] Intentando obtener IP local...");
  const ips = new Set();
  const pc = new RTCPeerConnection({ iceServers: [] });
  pc.createDataChannel("");
  pc.onicecandidate = (e) => {
    if (!e.candidate) {
      const localIp = Array.from(ips)[0] || null;
      console.log("[DEBUG] IP local obtenida:", localIp);
      callback(localIp);
      pc.close();
      return;
    }
    const match = e.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
    if (match) ips.add(match[1]);
  };
  pc.createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .catch((err) => {
      console.error("[ERROR] Al generar oferta WebRTC:", err);
      callback(null);
    });

  setTimeout(() => {
    const localIp = Array.from(ips)[0] || null;
    console.log("[DEBUG] Timeout IP local ->", localIp);
    try { pc.close(); } catch {}
    callback(localIp);
  }, 1500);
}

// =======================
// EVENTO PRINCIPAL
// =======================
document.getElementById("opForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const expression = document.getElementById("expression").value.trim();
  const clientDatetime = new Date().toISOString();
  const statusDiv = document.getElementById("status");

  console.log("[DEBUG] Expresión capturada:", expression);

  if (!expression) {
    statusDiv.textContent = "Por favor, escribe una operación.";
    return;
  }

  statusDiv.textContent = "Procesando operación...";
  console.log("[DEBUG] Procesando...");

  try {
    const publicIp = await getPublicIp();

    getLocalIPs(async (localIp) => {
      const payload = {
        expression,
        clientLocalIP: localIp,
        clientPublicIp: publicIp,
        clientDatetime
      };

      console.log("[DEBUG] Payload preparado para enviar:", payload);

      let response;
      try {
        response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (fetchErr) {
        console.error("[ERROR] Error al hacer fetch al webhook:", fetchErr);
        statusDiv.textContent = "❌ Error al contactar el servidor.";
        return;
      }

      console.log("[DEBUG] Respuesta HTTP recibida:", response.status, response.statusText);

      try {
        const textResponse = await response.text();
        console.log("[DEBUG] Texto bruto recibido:", textResponse);

        let data;
        try {
          data = JSON.parse(textResponse);
        } catch (parseErr) {
          console.warn("[WARN] No se pudo parsear JSON:", parseErr);
          data = null;
        }

        console.log("[DEBUG] JSON final interpretado:", data);

        if (data && typeof data.resultado !== "undefined") {
          statusDiv.innerHTML = `✅ Resultado: <strong>${data.resultado}</strong>`;
          console.log("[DEBUG] Resultado mostrado en pantalla:", data.resultado);
        } else {
          statusDiv.textContent = "✅ Operación enviada (sin resultado JSON).";
          console.warn("[WARN] No se encontró 'resultado' en la respuesta.");
        }

      } catch (err) {
        console.error("[ERROR] Al procesar la respuesta del servidor:", err);
        statusDiv.textContent = "❌ Error al procesar respuesta.";
      }
    });

  } catch (error) {
    console.error("[ERROR] Error general en el proceso:", error);
    statusDiv.textContent = "❌ No se pudo enviar la información.";
  }
});
