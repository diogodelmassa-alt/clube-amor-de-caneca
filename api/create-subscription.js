
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

export default async function handler(req, res) {
  // CORS Headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reason, price, payer_email } = req.body;

    if (!reason || !price) {
      return res.status(400).json({ error: 'Missing reason or price' });
    }

    const numericPrice = typeof price === 'string' 
      ? parseFloat(price.replace(',', '.')) 
      : price;

    console.log(`Creating preference for ${reason} - R$ ${numericPrice}`);

        const origin = req.headers.origin || 'https://clubeamordecaneca.com.br';
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: `Assinatura ${reason} - Clube Amor de Caneca`,
            quantity: 1,
            unit_price: numericPrice,
            currency_id: 'BRL',
          }
        ],
        payer: {
          email: payer_email || 'cliente@amordecaneca.com.br',
        },
        back_urls: {
          success: `${origin}/confirmacao.html.html`,
          failure: `${origin}/`,
          pending: `${origin}/`,
        },
        auto_return: 'approved',
        statement_descriptor: "AMOR DE CANECA",
        external_reference: `subscription_${Date.now()}`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago API Error:', data);
      return res.status(400).json({ error: data.message || 'Erro ao gerar checkout' });
    }

    return res.status(200).json({ init_point: data.init_point });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
