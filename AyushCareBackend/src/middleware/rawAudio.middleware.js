export const rawAudio = (req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        let buf = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        // If client sent multipart/form-data, extract the binary body between \r\n\r\n and the boundary
        if (contentType.includes('multipart/form-data') && buf.length > 0) {
            const headerEndIndex = buf.indexOf('\r\n\r\n');
            if (headerEndIndex !== -1) {
                const headerPart = buf.subarray(0, headerEndIndex).toString('latin1');
                const typeMatch = headerPart.match(/content-type:\s*([^\r\n;]+)/i);
                if (typeMatch) {
                    req.headers['content-type'] = typeMatch[1].trim();
                }
                const bodyStart = headerEndIndex + 4;
                const boundaryEndIndex = buf.lastIndexOf('\r\n--');
                if (boundaryEndIndex > bodyStart) {
                    buf = buf.subarray(bodyStart, boundaryEndIndex);
                } else {
                    buf = buf.subarray(bodyStart);
                }
            }
        }
        req.body = buf;
        next();
    });
    req.on('error', next);
};

