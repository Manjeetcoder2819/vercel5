import React, { useState, useEffect } from 'react';
import './LighthouseAudit.css';
import EmissionRating from './EmissionRating'; // Import the new component
import SemicircleEmissionBar from './SemicircleEmissionBar';
import ErrorPopup from './ErrorPopups'; // Import ErrorPopup component

const LighthouseAudit = () => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [strategy] = useState('desktop'); // Fixed strategy to 'desktop'
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

 // Fetch data from the backend to check if API is working
 useEffect(() => {
  fetch(process.env.REACT_APP_API_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json(); // Parse response as JSON
    })
    .then((data) => {
      console.log("Response:", data); // Logs { message: "API is working" }
      setMessage(data.message); // Set message to "API is working"
    })
    .catch((err) => console.error("Error:", err));
}, []);

  // Convert bytes to MB
  const convertBytesToMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

  // Calculate Carbon Footprint
  const calculateCarbonFootprint = (sizeInMB) => {
    const carbonPerMB = 0.6 / 1.8; // CO₂ per MB based on 1.8 MB producing 0.6 grams of CO₂
    return (sizeInMB * carbonPerMB).toFixed(2); // Calculate and return CO₂ emissions
  };

  // URL Validation Function
  const validateURL = (url) => {
    const urlPattern = /^(https?:\/\/)?([\w\-~]+(\.[\w\-~]+)+)(:[0-9]{1,5})?(\/[^\s]*)?$/i;

    if (!url.trim() || !urlPattern.test(url)) {
      setError('Invalid URL. Please enter a valid URL (e.g., https://example.com, http://localhost:3000).');
      return false;
    }

    setError(null);
    return true;
  };

  // Email Validation Function
  const validateEmail = (email) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim() || !emailPattern.test(email)) {
      setError('Invalid email. Please enter a valid email (e.g., example@gmail.com).');
      return false;
    }
    setError(null);
    return true;
  };

  // Form Validation
  const validateForm = () => {
    if (!validateURL(url) || !validateEmail(email)) {
      return false;
    }
    if (!name.trim() || name.length < 1) {
      setError('Name must be at least 1 character long.');
      return false;
    }
    setError(null);
    return true;
  };

  // Fetch Audit Data from Google API
  const fetchAuditData = async () => {
    const apiKey = `AIzaSyDE2uQD9el6VVvh_rNyEr8erL5cdv6Tavw`;
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&strategy=${strategy}&key=${apiKey}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch audit data');
      const data = await response.json();

      const byteWeight = data.lighthouseResult.audits['total-byte-weight']?.numericValue;
      if (!byteWeight) throw new Error('Total byte weight not found in API response.');

      const sizeInMB = convertBytesToMB(byteWeight);
      const carbonFootprint = calculateCarbonFootprint(sizeInMB);

      return { device: strategy, MB: sizeInMB, grams: carbonFootprint };
    } catch (error) {
      console.error('Error fetching audit data:', error);
      throw error;
    }
  };

  // Save Audit Data to the Backend API
  const saveAuditData = async (auditData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          url,
          results: {
            MB: auditData.MB,
            grams: auditData.grams,
          },
          deviceName: auditData.device,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save data');
      }

      console.log('Data saved successfully:', data);
    } catch (err) {
      console.error('Error saving data to the backend:', err);
      throw err;
    }
  };

  // Fetch and Save the Data Based on User Inputs
  const fetchData = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const auditData = await fetchAuditData();
      setResults(auditData);

      // Save data to backend
      await saveAuditData(auditData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Carbon Footprint</h2>

      {/* Display Backend API Message */}
      <p>{message}</p>

      {/* URL Input */}
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
      />

      {/* Name Input */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your Name"
      />

      {/* Email Input */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your Email"
      />

      {/* Analyze Button */}
      <button onClick={fetchData} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>

      {/* Error Message */}
      {error && <ErrorPopup message={error} position="20px" />}

      {/* Display Results */}
      {results && (
        <div>
          <p>Device: {results.device}</p>
          <p>Page Size: {results.MB} MB</p>
          <p>CO₂ Emissions: {results.grams} g</p>

          {/* Emission Rating */}
          <EmissionRating grams={parseFloat(results.grams)} />

          {/* Semicircle Emission Bar */}
          <SemicircleEmissionBar emissionValue={parseFloat(results.grams)} />
        </div>
      )}
    </div>
  );
};

export default LighthouseAudit;