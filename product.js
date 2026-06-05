export default async function handler(req, res) {
  const inputUrl = req.query.url;
  if (!inputUrl) {
    return res.status(400).json({ error: true, message: "URL não informada" });
  }

  try {
    let finalUrl = inputUrl;

    // Resolve encurtador meli.la
    try {
      const head = await fetch(inputUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.8"
        }
      });
      finalUrl = head.url || inputUrl;
    } catch (_) {}

    const page = await fetch(finalUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    });

    const html = await page.text();

    const pick = (...patterns) => {
      for (const p of patterns) {
        const m = html.match(p);
        if (m && m[1]) return clean(m[1]);
      }
      return "";
    };

    const clean = (s) => String(s || "")
      .replace(/\\u002F/g, "/")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#x2F;/g, "/")
      .replace(/\s+/g, " ")
      .trim();

    let title = pick(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<title[^>]*>(.*?)<\/title>/i,
      /"name"\s*:\s*"([^"]+)"/i
    );

    let image = pick(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /"image"\s*:\s*"([^"]+)"/i,
      /"secure_url"\s*:\s*"([^"]+)"/i
    );

    let priceRaw = pick(
      /"price"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i,
      /"amount"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
      /"priceAmount"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i
    );

    let price = "";
    if (priceRaw) {
      const n = Number(String(priceRaw).replace(",", "."));
      if (!Number.isNaN(n)) {
        price = n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
    }

    if (title) {
      title = title.replace(/\s*\|\s*MercadoLivre.*$/i, "")
                   .replace(/\s*-\s*Mercado Livre.*$/i, "")
                   .trim();
    }

    if (!title && !image && !price) {
      return res.status(200).json({
        error: true,
        message: "Não consegui ler os dados automaticamente. O Mercado Livre pode ter bloqueado a captura. Preencha manualmente.",
        finalUrl
      });
    }

    return res.status(200).json({ title, image, price, finalUrl });
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: "Erro ao buscar produto: " + err.message
    });
  }
}
