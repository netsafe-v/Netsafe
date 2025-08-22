function parseProxyLink(link) {
  // تشخیص پروتکل
  let protocol = '';
  if (link.startsWith('vless://')){ 
    protocol = 'vless';
  }
  else if (link.startsWith('vmess://')){
    protocol = 'vmess';
  } 
  else {
    return 'فقط VLESS و VMESS پشتیبانی می‌شوند'
  };

  let config = {
    inbounds: [{ port: 1080, listen: '127.0.0.1', protocol: 'socks' }],
    outbounds: [],
    rawInput: link
  };

  if (protocol === 'vless') {
    // VLESS ساده: فقط لینک رو بذار تو rawInput
    const match = link.match(/^vless:\/\/([^@]+)@([^:]+):(\d+)/);
    if (!match){
        return 'لینک VLESS نامعتبر است'
    };

    const id = match[1];       // UUID
    const address = match[2];  // host
    const port = parseInt(match[3]); // port

  config.outbounds.push({
    protocol: 'vless',
    settings: {
      vnext: [{ address, port, users: [{ id }] }]
    }
  });
  
  } else if (protocol === 'vmess') {
    // VMESS: Base64 decode و JSON parse
    const base64 = link.replace('vmess://', '');
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const obj = JSON.parse(decoded);
    console.log(obj)
    config.outbounds.push({
      protocol: 'vmess',
      settings: {
        vnext: [{
          address: obj.add,
          port: parseInt(obj.port),
          users: [{ id: obj.id, alterId: obj.aid || 0 }]
        }]
      },
      streamSettings: {
        network: obj.net,
        security: obj.security || 'none'
      }
    });
  }

  return config;
}


module.exports = { parseProxyLink };