import { NextResponse } from 'next/server';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

const REGION_COORDS: Record<string, { lat: number, lng: number }> = {
  'US': { lat: 39.8283, lng: -98.5795 },
  'CA': { lat: 56.1304, lng: -106.3468 },
  'GB': { lat: 55.3781, lng: -3.4360 },
  'AU': { lat: -25.2744, lng: 133.7751 },
  'JP': { lat: 36.2048, lng: 138.2529 },
  'CN': { lat: 35.8617, lng: 104.1954 },
  'DE': { lat: 51.1657, lng: 10.4515 },
  'FR': { lat: 46.2276, lng: 2.2137 },
  'RU': { lat: 61.5240, lng: 105.3188 },
  'BR': { lat: -14.2350, lng: -51.9253 },
  'IN': { lat: 20.5937, lng: 78.9629 },
  'ZA': { lat: -30.5595, lng: 22.9375 },
  'KR': { lat: 35.9078, lng: 127.7669 },
  'ES': { lat: 40.4637, lng: -3.7492 },
  'IT': { lat: 41.8719, lng: 12.5674 },
  'MX': { lat: 23.6345, lng: -102.5528 },
  'NL': { lat: 52.1326, lng: 5.2913 },
  'SE': { lat: 60.1282, lng: 18.6435 },
  'CH': { lat: 46.8182, lng: 8.2275 },
  'PL': { lat: 51.9194, lng: 19.1451 },
  'AT': { lat: 47.5162, lng: 14.5501 },
  'BE': { lat: 50.5039, lng: 4.4699 },
  'DK': { lat: 56.2639, lng: 9.5018 },
  'FI': { lat: 61.9241, lng: 25.7482 },
  'NO': { lat: 60.4720, lng: 8.4689 },
  'IE': { lat: 53.1424, lng: -7.6921 },
  'NZ': { lat: -40.9006, lng: 174.8860 },
  'SG': { lat: 1.3521, lng: 103.8198 },
  'MY': { lat: 4.2105, lng: 101.9758 },
  'ID': { lat: -0.7893, lng: 113.9213 },
  'PH': { lat: 12.8797, lng: 121.7740 },
  'TH': { lat: 15.8700, lng: 100.9925 },
  'VN': { lat: 14.0583, lng: 108.2772 },
  'PK': { lat: 30.3753, lng: 69.3451 },
  'BD': { lat: 23.6850, lng: 90.3563 },
  'LK': { lat: 7.8731, lng: 80.7718 },
  'IR': { lat: 32.4279, lng: 53.6880 },
  'TR': { lat: 38.9637, lng: 35.2433 },
  'IL': { lat: 31.0461, lng: 34.8516 },
  'SA': { lat: 23.8859, lng: 45.0792 },
  'AE': { lat: 23.4241, lng: 53.8478 },
  'EG': { lat: 26.8206, lng: 30.8025 },
  'NG': { lat: 9.0820, lng: 8.6753 },
  'KE': { lat: -0.0236, lng: 37.9062 },
  'TZ': { lat: -6.3690, lng: 34.8888 },
  'UG': { lat: 1.3733, lng: 32.2903 },
  'MA': { lat: 31.7917, lng: -7.0926 },
  'DZ': { lat: 28.0339, lng: 1.6596 },
  'TN': { lat: 33.8869, lng: 9.5375 },
  'LY': { lat: 26.3351, lng: 17.2283 },
  'LB': { lat: 33.8547, lng: 35.8623 },
  'JO': { lat: 31.2400, lng: 36.5100 },
  'SY': { lat: 34.8021, lng: 38.9968 },
  'IQ': { lat: 33.2232, lng: 43.6793 },
  'KW': { lat: 29.3117, lng: 47.4818 },
  'OM': { lat: 21.5126, lng: 55.9233 },
  'BH': { lat: 26.0667, lng: 50.5577 },
  'QA': { lat: 25.3548, lng: 51.1839 },
  'AR': { lat: -38.4161, lng: -63.6167 },
  'CL': { lat: -35.6751, lng: -71.5430 },
  'CO': { lat: 4.5709, lng: -74.2973 },
  'VE': { lat: 6.4238, lng: -66.5897 },
  'PE': { lat: -9.1900, lng: -75.0152 },
  'CU': { lat: 21.5218, lng: -77.7812 },
  'UA': { lat: 48.3794, lng: 31.1656 },
  'BY': { lat: 53.7098, lng: 27.9534 },
  'LT': { lat: 55.1694, lng: 23.8813 },
  'LV': { lat: 56.8796, lng: 24.6032 },
  'EE': { lat: 58.5953, lng: 25.0136 },
};

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

// Major US/CA Area Code approximations for enhanced tracking precision
const NANP_COORDS: Record<string, { lat: number, lng: number }> = {
  '212': { lat: 40.7128, lng: -74.0060 }, // NY
  '310': { lat: 34.0522, lng: -118.2437 }, // LA
  '415': { lat: 37.7749, lng: -122.4194 }, // SF
  '312': { lat: 41.8781, lng: -87.6298 }, // Chicago
  '305': { lat: 25.7617, lng: -80.1918 }, // Miami
  '702': { lat: 36.1699, lng: -115.1398 }, // Vegas
  '206': { lat: 47.6062, lng: -122.3321 }, // Seattle
  '416': { lat: 43.6510, lng: -79.3470 }, // Toronto
  '604': { lat: 49.2827, lng: -123.1207 }, // Vancouver
  '514': { lat: 45.5017, lng: -73.5673 }, // Montreal
  '202': { lat: 38.9072, lng: -77.0369 }, // DC
  '404': { lat: 33.7490, lng: -84.3880 }, // Atlanta
  '617': { lat: 42.3601, lng: -71.0589 }, // Boston
  '214': { lat: 32.7767, lng: -96.7970 }, // Dallas
  '713': { lat: 29.7604, lng: -95.3698 }, // Houston
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const number = searchParams.get('number');

  if (!number) {
    return NextResponse.json({ error: 'Missing phone parameter' }, { status: 400 });
  }

  let query = number.trim();
  const digitsOnly = query.replace(/\D/g, '');
  
  // Auto-detect NANP (+1 for US/Canada) if it's exactly 10 digits
  if (digitsOnly.length === 10 && !query.startsWith('+') && !query.startsWith('00')) {
      query = '+1' + digitsOnly;
  } else if (!query.startsWith('+') && !query.startsWith('00')) {
      query = '+' + query;
  }

  try {
      const parsedNumber = phoneUtil.parse(query);
      const isValid = phoneUtil.isValidNumber(parsedNumber);
      
      const regionCode = phoneUtil.getRegionCodeForNumber(parsedNumber) || 'Unknown';
      const countryCode = parsedNumber.getCountryCode();
      const nationalNumber = parsedNumber.getNationalNumber();

      const formatE164 = phoneUtil.format(parsedNumber, PhoneNumberFormat.E164);
      const formatIntl = phoneUtil.format(parsedNumber, PhoneNumberFormat.INTERNATIONAL);
      const formatNat = phoneUtil.format(parsedNumber, PhoneNumberFormat.NATIONAL);

      let regionName = 'Unknown Region';
      if (regionCode !== 'Unknown') {
          try {
              regionName = REGION_NAMES.of(regionCode) || regionCode;
          } catch {
              regionName = regionCode;
          }
      }

      // Basic Line Type Inference based on typical mobile starting digits in many regions
      const firstDigit = String(nationalNumber).charAt(0);
      let lineType = 'LANDLINE';
      if (countryCode === 1 && String(nationalNumber).length === 10) {
         lineType = 'MOBILE_OR_LANDLINE';
      } else if (firstDigit === '7' || firstDigit === '8' || firstDigit === '9') {
         lineType = 'MOBILE';
      }

      let coords = REGION_COORDS[regionCode];
      
      // Override with precise area code coordinates for NANP
      if (countryCode === 1) {
          const areaCode = String(nationalNumber).substring(0, 3);
          if (NANP_COORDS[areaCode]) {
              coords = NANP_COORDS[areaCode];
          }
      }

      return NextResponse.json({
          query: number,
          valid: isValid,
          number: formatE164,
          international: formatIntl,
          national: formatNat,
          country_code: `+${countryCode}`,
          region: regionName,
          region_code: regionCode,
          line_type: lineType,
          lat: coords?.lat || null,
          lng: coords?.lng || null
      });

  } catch (err: any) {
      return NextResponse.json({ 
          query: number,
          valid: false,
          error: err.message,
          number: query,
          international: query,
          national: query,
          country_code: 'Unknown',
          region: 'Invalid format',
          line_type: 'UNKNOWN',
          lat: null,
          lng: null
      });
  }
}
