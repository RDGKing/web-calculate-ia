// =======================
// CONFIGURA TU WEBHOOK
// =======================
const WEBHOOK_URL = "https://angelrodrigo.app.n8n.cloud/webhook/Operacion";

// =======================
// OBTENER IPs DEL CLIENTE
// =======================

// IP pública (usando ipify)
async function getPublicIp() {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const j = await r.json();
    return j.ip;
  } catch (e) {
    console.error("Error al obtener IP pública:", e);
    return null;
  }
}

// IP local (WebRTC, puede fallar)
function getLocalIPs(callback) {
  const ips = new Set();
  const pc = new RTCPeerConnection({ iceServers: [] });
  pc.createDataChannel("");
  pc.onicecandidate = (e) => {
    if (!e.candidate) {
      callback(Array.from(ips)[0] || null);
      pc.close();
      return;
    }
    const match = e.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
    if (match) ips.add(match[1]);
  };
  pc.createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .catch(() => callback(null));

  // timeout de seguridad
  setTimeout(() => {
    callback(Array.from(ips)[0] || null);
    try { pc.close(); } catch {}
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

  if (!expression) {
    statusDiv.textContent = "Por favor, escribe una operación.";
    return;
  }

  statusDiv.textContent = "Procesando operación...";

  try {
    const publicIp = await getPublicIp();

    getLocalIPs(async (localIp) => {
      const payload = {
        expression,
        clientLocalIP: localIp,
        clientPublicIp: publicIp,
        clientDatetime
      };

      // 👇 Enviamos al webhook
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // 👇 Intentamos leer la respuesta JSON del flujo n8n
      try {
        const data = await response.json();
        if (data?.resultado) {
          statusDiv.innerHTML = `✅ Resultado: <strong>${data.resultado}</strong>`;
        } else {
          statusDiv.textContent = "✅ Operación enviada (sin resultado JSON).";
        }
      } catch (err) {
        console.warn("No se pudo leer JSON de respuesta:", err);
        statusDiv.textContent = "✅ Operación enviada correctamente (sin respuesta legible).";
      }
    });
  } catch (error) {
    console.error("Error:", error);
    statusDiv.textContent = "❌ No se pudo enviar la información.";
  }
});
