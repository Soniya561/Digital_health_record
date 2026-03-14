
  # Digital Health Record System

  This is a code bundle for Digital Health Record System. The original project is available at https://www.figma.com/design/Et3HeDbYZSmcMioLiKbRsz/Digital-Health-Record-System.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## HTTPS for camera/microphone

  Camera and microphone APIs require a secure context. For local development on devices, serve the frontend over HTTPS with a trusted certificate.

  1. Generate or install a trusted dev certificate for your host (e.g. `localhost`, or your LAN IP).
  2. Place the files at:
     - `frontend/certs/localhost.pem`
     - `frontend/certs/localhost-key.pem`
  3. Ensure `frontend/.env` has:
     - `VITE_DEV_HTTPS=true`
     - `VITE_DEV_HTTPS_CERT_PATH=certs/localhost.pem`
     - `VITE_DEV_HTTPS_KEY_PATH=certs/localhost-key.pem`

  If you access the app via a LAN IP, the certificate must include that IP (or hostname) or the browser will block camera and mic access.
  
