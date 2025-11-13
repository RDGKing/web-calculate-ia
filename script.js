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

      // Enviamos al webhook
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Leemos la respuesta del flujo n8n
      const data = await response.json();

      // Mostrar el resultado devuelto por el modelo
      if (data.resultado) {
        statusDiv.innerHTML = `✅ Resultado: <strong>${data.resultado}</strong>`;
      } else {
        // En caso de que el JSON tenga otra estructura o falle
        statusDiv.textContent = "No se recibió un resultado válido.";
        console.log("Respuesta recibida:", data);
      }
    });
  } catch (error) {
    console.error("Error:", error);
    statusDiv.textContent = "❌ No se pudo enviar la información.";
  }
});
