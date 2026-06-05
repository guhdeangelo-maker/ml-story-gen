export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: true, message: "Link não informado" });
  }

  try {
    const r = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept-language": "pt-BR,pt;q=0.9"
      }
    });

    const finalUrl = r.url;
    const html = await r.text();

    const get = (regex) => {
      const m = html.match(regex);
      return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim() : "";
    };

    let title = get(/<meta property="og:title" content="([^"]+)"/i);
    let image = get(/<meta property="og:image" content="([^"]+)"/i);
    let price = get(/"price":\s*"?([0-9.]+)"?/i);

    if (price) {
      price = Number(price).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });
    }

    return res.status(200).json({
      title,
      image,
      price,
      finalUrl
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: e.message
    });
  }
}
