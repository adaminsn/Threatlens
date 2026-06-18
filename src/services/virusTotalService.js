require('dotenv').config();

// VIRUSTOTAL API INTEGRATION

async function checkVirusTotalURL(url) {
  try {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.log('❌ API Key tidak valid');
      return { scanned: false, message: 'API Key tidak dikonfigurasi' };
    }
    
    const encodedUrl = encodeURIComponent(url);
    
    const scanResponse = await fetch('https://www.virustotal.com/api/v3/urls', {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `url=${encodedUrl}`
    });
    
    const scanData = await scanResponse.json();
    const scanId = scanData.data?.id;
    
    if (!scanId) {
      console.log('❌ Tidak dapat scan URL');
      return { scanned: false, error: 'Gagal scan URL' };
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const resultResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${scanId}`, {
      headers: { 'x-apikey': apiKey }
    });
    
    const resultData = await resultResponse.json();
    const stats = resultData.data?.attributes?.stats;
    
    if (stats) {
      const malicious = stats.malicious || 0;
      const suspicious = stats.suspicious || 0;
      const undetected = stats.undetected || 0;
      const harmless = stats.harmless || 0;
      const total = malicious + suspicious + undetected + harmless;
      const riskScore = total > 0 ? (malicious / total) * 100 : 0;
      
      console.log(`📊 Hasil: ${malicious}/${total} engine mendeteksi (${riskScore}%)`);
      
      return {
        scanned: true,
        malicious_count: malicious,
        suspicious_count: suspicious,
        total_engines: total,
        risk_score: riskScore,
        recommended_level: riskScore >= 50 ? 'dangerous' : (riskScore >= 20 ? 'suspicious' : 'safe'),
        stats: stats
      };
    }
    
    return { scanned: false, error: 'Tidak ada stats' };
  } catch (err) {
    console.error('VirusTotal URL error:', err.message);
    return { scanned: false, error: err.message };
  }
}

async function checkVirusTotalIP(ip) {
  try {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return { scanned: false, message: 'API Key tidak dikonfigurasi' };
    }
    
    const response = await fetch(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
      headers: { 'x-apikey': apiKey }
    });
    
    if (response.status === 404) {
      return { scanned: false, not_found: true };
    }
    
    const data = await response.json();
    const stats = data.data?.attributes?.last_analysis_stats;
    
    if (stats) {
      const total = (stats.malicious || 0) + (stats.suspicious || 0) + (stats.undetected || 0) + (stats.harmless || 0);
      const malicious = stats.malicious || 0;
      const riskScore = total > 0 ? (malicious / total) * 100 : 0;
      
      return {
        scanned: true,
        malicious_count: malicious,
        suspicious_count: stats.suspicious || 0,
        total_engines: total,
        risk_score: riskScore,
        recommended_level: riskScore >= 50 ? 'dangerous' : (riskScore >= 20 ? 'suspicious' : 'safe'),
        stats: stats
      };
    }
    
    return { scanned: false };
  } catch (err) {
    console.error('VirusTotal IP error:', err.message);
    return { scanned: false, error: err.message };
  }
}

async function checkVirusTotalHash(hash) {
  try {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey) return { scanned: false };
    
    const response = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
      headers: { 'x-apikey': apiKey }
    });
    
    if (response.status === 404) {
      return { scanned: false, not_found: true };
    }
    
    const data = await response.json();
    const stats = data.data?.attributes?.last_analysis_stats;
    
    if (stats) {
      const malicious = stats.malicious || 0;
      const total = (stats.malicious || 0) + (stats.undetected || 0) + (stats.harmless || 0);
      const riskScore = total > 0 ? (malicious / total) * 100 : 0;
      
      console.log(`Hash result: ${malicious}/${total} engines detected (${riskScore}%)`);
      
      return {
        scanned: true,
        malicious_count: malicious,
        total_engines: total,
        risk_score: riskScore,
        recommended_level: riskScore >= 50 ? 'dangerous' : (riskScore >= 20 ? 'suspicious' : 'safe')
      };
    }
    
    return { scanned: false };
  } catch (err) {
    console.error('VirusTotal Hash error:', err.message);
    return { scanned: false, error: err.message };
  }
}

async function checkVirusTotalDomain(domain) {
  try {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return { scanned: false, message: 'API Key tidak dikonfigurasi' };
    }
    
    const response = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, {
      headers: { 'x-apikey': apiKey }
    });
    
    if (response.status === 404) {
      return { scanned: false, not_found: true };
    }
    
    const data = await response.json();
    const stats = data.data?.attributes?.last_analysis_stats;
    
    if (stats) {
      const total = (stats.malicious || 0) + (stats.suspicious || 0) + (stats.undetected || 0) + (stats.harmless || 0);
      const malicious = stats.malicious || 0;
      const riskScore = total > 0 ? (malicious / total) * 100 : 0;
      
      return {
        scanned: true,
        malicious_count: malicious,
        suspicious_count: stats.suspicious || 0,
        total_engines: total,
        risk_score: riskScore,
        recommended_level: riskScore >= 50 ? 'dangerous' : (riskScore >= 20 ? 'suspicious' : 'safe'),
        stats: stats
      };
    }
    
    return { scanned: false };
  } catch (err) {
    console.error('VirusTotal Domain error:', err.message);
    return { scanned: false, error: err.message };
  }
}

const checkWithVirusTotal = async (indicator, type) => {
  try {
    switch(type) {
      case 'url':   return await checkVirusTotalURL(indicator);
      case 'ip':    return await checkVirusTotalIP(indicator);
      case 'hash':  return await checkVirusTotalHash(indicator);
      case 'domain':return await checkVirusTotalDomain(indicator);
      default:      return { scanned: false, error: 'Tipe tidak dikenal' };
    }
  } catch (err) {
    console.error('VirusTotal check error:', err.message);
    return { scanned: false, error: err.message };
  }
};

module.exports = { checkWithVirusTotal };