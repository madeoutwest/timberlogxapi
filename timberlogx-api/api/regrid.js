export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const REGRID_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJyZWdyaWQuY29tIiwiaWF0IjoxNzY4NDE2MDM2LCJleHAiOjE3NzYxOTIwMzYsImciOjEwNjkzNSwidCI6MSwiY2FwIjoicGE6dHMiLCJ0aSI6MTA0NX0.qEm6OjkmXNwL3RZuoGXNrRwFEYmCYbzOeQ4yLvP2CVM';
  
  const { endpoint, query, context } = req.query;
  
  let url;
  if (endpoint === 'typeahead') {
    url = `https://app.regrid.com/api/v1/typeahead.json?query=${encodeURIComponent(query)}&context=/us/or&token=${REGRID_TOKEN}`;
  } else if (endpoint === 'search') {
    url = `https://app.regrid.com/api/v1/search.json?query=${encodeURIComponent(query)}&context=${encodeURIComponent(context)}&limit=1&token=${REGRID_TOKEN}`;
  } else {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
