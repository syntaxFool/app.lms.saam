import { Handler } from '@netlify/functions'

// Use the same proxy GAS URL for consistency
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzbitA_BClFUviaCXOMAwP6Kj2bkx9jlardOgMD1UWrDCVDYNsDtLVPWANscRLK4P1B/exec'

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    
    // Forward request to Google Apps Script (same as proxy)
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.text()
    
    // Log for debugging
    console.log('Auth response status:', response.status)
    console.log('Auth response body:', data.substring(0, 200))
    
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: data
    }
  } catch (error) {
    console.error('Auth function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error', details: String(error) })
    }
  }
}
