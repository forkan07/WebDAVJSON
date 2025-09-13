# WebDAVJSON

WebDAVJSON is a simple PHP/Node.js script that provides file management APIs. It supports CORS, optional API key authentication, upload with extension restrictions, and JSON response for file listing.

## Features
- CORS support
- Optional API key authentication
- File listing (JSON)
- File upload, download, and delete
- Extension restrictions
- Single-file program

## Windows Setup

```powershell
winget install FiloSottile.mkcert Node.js --silent
mkcert -install
mkcert localhost
npm install mime-types
node index.mjs
# await fetch('https://localhost:8443/').then(r=>r.json())
# await fetch('https://localhost:8443/?filename=foo.txt', {method: 'PUT', body: 'foobar'})
```

## Linux Setup

```bash
wget https://raw.githubusercontent.com/GitHub30/WebDAVJSON/refs/heads/main/index.php
```

## API Endpoints

| Method   | Path                        | Description             |
|----------|-----------------------------|-------------------------|
| GET      | /?filename=abc.txt          | Download file           |
| GET      | /                           | List files (JSON)       |
| POST/PUT | /                           | Upload file             |
| POST/PUT | /?filename=abc.txt          | Binary upload           |
| DELETE   | /?filename=abc.txt          | Delete file             |

## Usage Examples

### List files
```bash
curl http://localhost/
```

### Search files (partial match)
```bash
curl "http://localhost/?q=abc"
```

### Download file
```bash
curl -O http://localhost/?filename=abc.txt
```

### Download file (as attachment)
```bash
curl -OJ "http://localhost/?download&filename=abc.txt"
```

### Upload file (multipart/form-data)
```bash
curl -F "file=@abc.txt" http://localhost/
```

### Upload file (PUT, binary)
```bash
curl -X PUT --data-binary @abc.txt "http://localhost/?filename=abc.txt"
```

### Delete file
```bash
curl -X DELETE "http://localhost/?filename=abc.txt"
```

## Authentication (API Key)
If you set a value for `$api_key` in `index.php`, the header `Authorization: Bearer <API_KEY>` is required.

Example:
```bash
curl -H "Authorization: Bearer your_api_key" http://localhost/
```

## Allowed Extensions
`txt, jpg, png, webp, heic, gif, pdf, docx, xlsx, zip, mp4, gz`

## License
MIT
