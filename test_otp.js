// sendOtp.js
async function sendOTP(email) {
  try {
    // Use backend URL from environment variable if available, otherwise fallback to localhost
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:4000/api/auth';

    const response = await fetch(`${BACKEND_URL}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    console.log('OTP Response:', data);

    if (data.success) {
      alert('OTP sent successfully!');
    } else {
      alert('Failed to send OTP. Try again.');
    }
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    alert('Error sending OTP. Check console for details.');
  }
}

// Example usage:
sendOTP('test@example.com');