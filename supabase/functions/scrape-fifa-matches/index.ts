import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCRAPE-FIFA-MATCHES] ${step}${detailsStr}`);
};

// Country code to English name mapping — ALL 48 CONFIRMED TEAMS
const countryNames: Record<string, string> = {
  'MEX': 'Mexico', 'RSA': 'South Africa', 'KOR': 'South Korea', 'CZE': 'Czechia',
  'CAN': 'Canada', 'BIH': 'Bosnia-Herzegovina', 'QAT': 'Qatar', 'SUI': 'Switzerland',
  'BRA': 'Brazil', 'MAR': 'Morocco', 'HAI': 'Haiti', 'SCO': 'Scotland',
  'USA': 'United States', 'PAR': 'Paraguay', 'AUS': 'Australia', 'TUR': 'Türkiye',
  'GER': 'Germany', 'CUW': 'Curaçao', 'CIV': 'Ivory Coast', 'ECU': 'Ecuador',
  'NED': 'Netherlands', 'JPN': 'Japan', 'SWE': 'Sweden', 'TUN': 'Tunisia',
  'BEL': 'Belgium', 'EGY': 'Egypt', 'IRN': 'Iran', 'NZL': 'New Zealand',
  'ESP': 'Spain', 'CPV': 'Cape Verde', 'KSA': 'Saudi Arabia', 'URU': 'Uruguay',
  'FRA': 'France', 'SEN': 'Senegal', 'IRQ': 'Iraq', 'NOR': 'Norway',
  'ARG': 'Argentina', 'ALG': 'Algeria', 'AUT': 'Austria', 'JOR': 'Jordan',
  'POR': 'Portugal', 'COD': 'Congo DR', 'UZB': 'Uzbekistan', 'COL': 'Colombia',
  'ENG': 'England', 'CRO': 'Croatia', 'GHA': 'Ghana', 'PAN': 'Panama',
};

// Country code to flag URL (using lowercase ISO codes)
const countryFlags: Record<string, string> = {
  'MEX': 'mx', 'RSA': 'za', 'KOR': 'kr', 'CZE': 'cz',
  'CAN': 'ca', 'BIH': 'ba', 'QAT': 'qa', 'SUI': 'ch',
  'BRA': 'br', 'MAR': 'ma', 'HAI': 'ht', 'SCO': 'gb-sct',
  'USA': 'us', 'PAR': 'py', 'AUS': 'au', 'TUR': 'tr',
  'GER': 'de', 'CUW': 'cw', 'NED': 'nl', 'JPN': 'jp',
  'CIV': 'ci', 'ECU': 'ec', 'SWE': 'se', 'TUN': 'tn',
  'ESP': 'es', 'CPV': 'cv', 'BEL': 'be', 'EGY': 'eg',
  'KSA': 'sa', 'URU': 'uy', 'IRN': 'ir', 'NZL': 'nz',
  'FRA': 'fr', 'SEN': 'sn', 'IRQ': 'iq', 'NOR': 'no',
  'ARG': 'ar', 'ALG': 'dz', 'AUT': 'at', 'JOR': 'jo',
  'POR': 'pt', 'COD': 'cd', 'UZB': 'uz', 'COL': 'co',
  'ENG': 'gb-eng', 'CRO': 'hr', 'GHA': 'gh', 'PAN': 'pa',
};

// Official International Football Tournament 2026 Stadium Names (English city names)
const stadiumNames: Record<string, string> = {
  'Mexico City': 'Estadio Azteca',
  'Guadalajara': 'Estadio Akron',
  'Monterrey': 'Estadio BBVA',
  'Toronto': 'BMO Field',
  'Vancouver': 'BC Place',
  'Atlanta': 'Mercedes-Benz Stadium',
  'Boston': 'Gillette Stadium',
  'Dallas': 'AT&T Stadium',
  'Houston': 'NRG Stadium',
  'Kansas City': 'GEHA Field at Arrowhead Stadium',
  'Los Angeles': 'SoFi Stadium',
  'Miami': 'Hard Rock Stadium',
  'New York/New Jersey': 'MetLife Stadium',
  'Philadelphia': 'Lincoln Financial Field',
  'San Francisco Bay Area': "Levi's Stadium",
  'Seattle': 'Lumen Field',
};

interface ParsedMatch {
  external_id: string;
  home_team: string;
  away_team: string;
  home_team_flag: string | null;
  away_team_flag: string | null;
  match_date: string;
  venue: string;
  city: string;
  stage: string;
  group_name: string | null;
}

function getFlag(code: string): string | null {
  const isoCode = countryFlags[code];
  return isoCode ? `https://flagcdn.com/w80/${isoCode}.png` : null;
}

function getStadium(city: string): string {
  return stadiumNames[city] || `Stadium ${city}`;
}

// ===================================================================================
// Complete International Football Tournament 2026 match data - All 104 matches
// Source: Official API (api.fifa.com/api/v3/calendar/matches)
// All times in CDMX timezone (UTC-6, CST - Mexico no longer observes DST)
// Validated against https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023
// ===================================================================================
const predefinedMatches: ParsedMatch[] = [
  // ============= GROUP A (Mexico, South Africa, South Korea, Czechia) =============
  { external_id: '400021443', home_team: 'Mexico', away_team: 'South Africa', home_team_flag: getFlag('MEX'), away_team_flag: getFlag('RSA'), match_date: '2026-06-11T13:00:00-06:00', venue: getStadium('Mexico City'), city: 'Mexico City', stage: 'group', group_name: 'A' },
  { external_id: '400021441', home_team: 'South Korea', away_team: 'Czechia', home_team_flag: getFlag('KOR'), away_team_flag: getFlag('CZE'), match_date: '2026-06-11T20:00:00-06:00', venue: getStadium('Guadalajara'), city: 'Guadalajara', stage: 'group', group_name: 'A' },
  { external_id: '400021440', home_team: 'Czechia', away_team: 'South Africa', home_team_flag: getFlag('CZE'), away_team_flag: getFlag('RSA'), match_date: '2026-06-18T10:00:00-06:00', venue: getStadium('Atlanta'), city: 'Atlanta', stage: 'group', group_name: 'A' },
  { external_id: '400021442', home_team: 'Mexico', away_team: 'South Korea', home_team_flag: getFlag('MEX'), away_team_flag: getFlag('KOR'), match_date: '2026-06-18T19:00:00-06:00', venue: getStadium('Guadalajara'), city: 'Guadalajara', stage: 'group', group_name: 'A' },
  { external_id: '400021444', home_team: 'Czechia', away_team: 'Mexico', home_team_flag: getFlag('CZE'), away_team_flag: getFlag('MEX'), match_date: '2026-06-24T19:00:00-06:00', venue: getStadium('Mexico City'), city: 'Mexico City', stage: 'group', group_name: 'A' },
  { external_id: '400021445', home_team: 'South Africa', away_team: 'South Korea', home_team_flag: getFlag('RSA'), away_team_flag: getFlag('KOR'), match_date: '2026-06-24T19:00:00-06:00', venue: getStadium('Monterrey'), city: 'Monterrey', stage: 'group', group_name: 'A' },

  // ============= GROUP B (Canada, Bosnia-Herzegovina, Qatar, Switzerland) =============
  { external_id: '400021449', home_team: 'Canada', away_team: 'Bosnia-Herzegovina', home_team_flag: getFlag('CAN'), away_team_flag: getFlag('BIH'), match_date: '2026-06-12T13:00:00-06:00', venue: getStadium('Toronto'), city: 'Toronto', stage: 'group', group_name: 'B' },
  { external_id: '400021447', home_team: 'Qatar', away_team: 'Switzerland', home_team_flag: getFlag('QAT'), away_team_flag: getFlag('SUI'), match_date: '2026-06-13T13:00:00-06:00', venue: getStadium('San Francisco Bay Area'), city: 'San Francisco Bay Area', stage: 'group', group_name: 'B' },
  { external_id: '400021446', home_team: 'Switzerland', away_team: 'Bosnia-Herzegovina', home_team_flag: getFlag('SUI'), away_team_flag: getFlag('BIH'), match_date: '2026-06-18T13:00:00-06:00', venue: getStadium('Los Angeles'), city: 'Los Angeles', stage: 'group', group_name: 'B' },
  { external_id: '400021450', home_team: 'Canada', away_team: 'Qatar', home_team_flag: getFlag('CAN'), away_team_flag: getFlag('QAT'), match_date: '2026-06-18T16:00:00-06:00', venue: getStadium('Vancouver'), city: 'Vancouver', stage: 'group', group_name: 'B' },
  { external_id: '400021451', home_team: 'Switzerland', away_team: 'Canada', home_team_flag: getFlag('SUI'), away_team_flag: getFlag('CAN'), match_date: '2026-06-24T13:00:00-06:00', venue: getStadium('Vancouver'), city: 'Vancouver', stage: 'group', group_name: 'B' },
  { external_id: '400021448', home_team: 'Bosnia-Herzegovina', away_team: 'Qatar', home_team_flag: getFlag('BIH'), away_team_flag: getFlag('QAT'), match_date: '2026-06-24T13:00:00-06:00', venue: getStadium('Seattle'), city: 'Seattle', stage: 'group', group_name: 'B' },

  // ============= GROUP C (Brazil, Morocco, Haiti, Scotland) =============
  { external_id: '400021456', home_team: 'Brazil', away_team: 'Morocco', home_team_flag: getFlag('BRA'), away_team_flag: getFlag('MAR'), match_date: '2026-06-13T16:00:00-06:00', venue: getStadium('New York/New Jersey'), city: 'New York/New Jersey', stage: 'group', group_name: 'C' },
  { external_id: '400021453', home_team: 'Haiti', away_team: 'Scotland', home_team_flag: getFlag('HAI'), away_team_flag: getFlag('SCO'), match_date: '2026-06-13T19:00:00-06:00', venue: getStadium('Boston'), city: 'Boston', stage: 'group', group_name: 'C' },
  { external_id: '400021454', home_team: 'Scotland', away_team: 'Morocco', home_team_flag: getFlag('SCO'), away_team_flag: getFlag('MAR'), match_date: '2026-06-19T16:00:00-06:00', venue: getStadium('Boston'), city: 'Boston', stage: 'group', group_name: 'C' },
  { external_id: '400021457', home_team: 'Brazil', away_team: 'Haiti', home_team_flag: getFlag('BRA'), away_team_flag: getFlag('HAI'), match_date: '2026-06-19T18:30:00-06:00', venue: getStadium('Philadelphia'), city: 'Philadelphia', stage: 'group', group_name: 'C' },
  { external_id: '400021455', home_team: 'Scotland', away_team: 'Brazil', home_team_flag: getFlag('SCO'), away_team_flag: getFlag('BRA'), match_date: '2026-06-24T16:00:00-06:00', venue: getStadium('Miami'), city: 'Miami', stage: 'group', group_name: 'C' },
  { external_id: '400021452', home_team: 'Morocco', away_team: 'Haiti', home_team_flag: getFlag('MAR'), away_team_flag: getFlag('HAI'), match_date: '2026-06-24T16:00:00-06:00', venue: getStadium('Atlanta'), city: 'Atlanta', stage: 'group', group_name: 'C' },

  // ============= GROUP D (United States, Paraguay, Australia, Türkiye) =============
  { external_id: '400021458', home_team: 'United States', away_team: 'Paraguay', home_team_flag: getFlag('USA'), away_team_flag: getFlag('PAR'), match_date: '2026-06-12T19:00:00-06:00', venue: getStadium('Los Angeles'), city: 'Los Angeles', stage: 'group', group_name: 'D' },
  { external_id: '400021463', home_team: 'Australia', away_team: 'Türkiye', home_team_flag: getFlag('AUS'), away_team_flag: getFlag('TUR'), match_date: '2026-06-13T22:00:00-06:00', venue: getStadium('Vancouver'), city: 'Vancouver', stage: 'group', group_name: 'D' },
  { external_id: '400021462', home_team: 'United States', away_team: 'Australia', home_team_flag: getFlag('USA'), away_team_flag: getFlag('AUS'), match_date: '2026-06-19T13:00:00-06:00', venue: getStadium('Seattle'), city: 'Seattle', stage: 'group', group_name: 'D' },
  { external_id: '400021460', home_team: 'Türkiye', away_team: 'Paraguay', home_team_flag: getFlag('TUR'), away_team_flag: getFlag('PAR'), match_date: '2026-06-19T21:00:00-06:00', venue: getStadium('San Francisco Bay Area'), city: 'San Francisco Bay Area', stage: 'group', group_name: 'D' },
  { external_id: '400021459', home_team: 'Türkiye', away_team: 'United States', home_team_flag: getFlag('TUR'), away_team_flag: getFlag('USA'), match_date: '2026-06-25T20:00:00-06:00', venue: getStadium('Los Angeles'), city: 'Los Angeles', stage: 'group', group_name: 'D' },
  { external_id: '400021461', home_team: 'Paraguay', away_team: 'Australia', home_team_flag: getFlag('PAR'), away_team_flag: getFlag('AUS'), match_date: '2026-06-25T20:00:00-06:00', venue: getStadium('San Francisco Bay Area'), city: 'San Francisco Bay Area', stage: 'group', group_name: 'D' },

  // ============= GROUP E (Germany, Curaçao, Ivory Coast, Ecuador) =============
  { external_id: '400021464', home_team: 'Germany', away_team: 'Curaçao', home_team_flag: getFlag('GER'), away_team_flag: getFlag('CUW'), match_date: '2026-06-14T11:00:00-06:00', venue: getStadium('Houston'), city: 'Houston', stage: 'group', group_name: 'E' },
  { external_id: '400021467', home_team: 'Ivory Coast', away_team: 'Ecuador', home_team_flag: getFlag('CIV'), away_team_flag: getFlag('ECU'), match_date: '2026-06-14T17:00:00-06:00', venue: getStadium('Philadelphia'), city: 'Philadelphia', stage: 'group', group_name: 'E' },
  { external_id: '400021469', home_team: 'Germany', away_team: 'Ivory Coast', home_team_flag: getFlag('GER'), away_team_flag: getFlag('CIV'), match_date: '2026-06-20T14:00:00-06:00', venue: getStadium('Toronto'), city: 'Toronto', stage: 'group', group_name: 'E' },
  { external_id: '400021465', home_team: 'Ecuador', away_team: 'Curaçao', home_team_flag: getFlag('ECU'), away_team_flag: getFlag('CUW'), match_date: '2026-06-20T18:00:00-06:00', venue: getStadium('Kansas City'), city: 'Kansas City', stage: 'group', group_name: 'E' },
  { external_id: '400021468', home_team: 'Curaçao', away_team: 'Ivory Coast', home_team_flag: getFlag('CUW'), away_team_flag: getFlag('CIV'), match_date: '2026-06-25T14:00:00-06:00', venue: getStadium('Philadelphia'), city: 'Philadelphia', stage: 'group', group_name: 'E' },
  { external_id: '400021466', home_team: 'Ecuador', away_team: 'Germany', home_team_flag: getFlag('ECU'), away_team_flag: getFlag('GER'), match_date: '2026-06-25T14:00:00-06:00', venue: getStadium('New York/New Jersey'), city: 'New York/New Jersey', stage: 'group', group_name: 'E' },

  // ============= GROUP F (Netherlands, Japan, Sweden, Tunisia) =============
  { external_id: '400021470', home_team: 'Netherlands', away_team: 'Japan', home_team_flag: getFlag('NED'), away_team_flag: getFlag('JPN'), match_date: '2026-06-14T14:00:00-06:00', venue: getStadium('Dallas'), city: 'Dallas', stage: 'group', group_name: 'F' },
  { external_id: '400021474', home_team: 'Sweden', away_team: 'Tunisia', home_team_flag: getFlag('SWE'), away_team_flag: getFlag('TUN'), match_date: '2026-06-14T20:00:00-06:00', venue: getStadium('Monterrey'), city: 'Monterrey', stage: 'group', group_name: 'F' },
  { external_id: '400021472', home_team: 'Netherlands', away_team: 'Sweden', home_team_flag: getFlag('NED'), away_team_flag: getFlag('SWE'), match_date: '2026-06-20T11:00:00-06:00', venue: getStadium('Houston'), city: 'Houston', stage: 'group', group_name: 'F' },
  { external_id: '400021475', home_team: 'Tunisia', away_team: 'Japan', home_team_flag: getFlag('TUN'), away_team_flag: getFlag('JPN'), match_date: '2026-06-20T22:00:00-06:00', venue: getStadium('Monterrey'), city: 'Monterrey', stage: 'group', group_name: 'F' },
  { external_id: '400021471', home_team: 'Japan', away_team: 'Sweden', home_team_flag: getFlag('JPN'), away_team_flag: getFlag('SWE'), match_date: '2026-06-25T17:00:00-06:00', venue: getStadium('Dallas'), city: 'Dallas', stage: 'group', group_name: 'F' },
  { external_id: '400021473', home_team: 'Tunisia', away_team: 'Netherlands', home_team_flag: getFlag('TUN'), away_team_flag: getFlag('NED'), match_date: '2026-06-25T17:00:00-06:00', venue: getStadium('Kansas City'), city: 'Kansas City', stage: 'group', group_name: 'F' },

  // ============= GROUP G (Belgium, Egypt, Iran, New Zealand) =============
  { external_id: '400021478', home_team: 'Belgium', away_team: 'Egypt', home_team_flag: getFlag('BEL'), away_team_flag: getFlag('EGY'), match_date: '2026-06-15T13:00:00-06:00', venue: getStadium('Seattle'), city: 'Seattle', stage: 'group', group_name: 'G' },
  { external_id: '400021476', home_team: 'Iran', away_team: 'New Zealand', home_team_flag: getFlag('IRN'), away_team_flag: getFlag('NZL'), match_date: '2026-06-15T19:00:00-06:00', venue: getStadium('Los Angeles'), city: 'Los Angeles', stage: 'group', group_name: 'G' },
  { external_id: '400021477', home_team: 'Belgium', away_team: 'Iran', home_team_flag: getFlag('BEL'), away_team_flag: getFlag('IRN'), match_date: '2026-06-21T13:00:00-06:00', venue: getStadium('Los Angeles'), city: 'Los Angeles', stage: 'group', group_name: 'G' },
  { external_id: '400021480', home_team: 'New Zealand', away_team: 'Egypt', home_team_flag: getFlag('NZL'), away_team_flag: getFlag('EGY'), match_date: '2026-06-21T19:00:00-06:00', venue: getStadium('Vancouver'), city: 'Vancouver', stage: 'group', group_name: 'G' },
  { external_id: '400021479', home_team: 'Egypt', away_team: 'Iran', home_team_flag: getFlag('EGY'), away_team_flag: getFlag('IRN'), match_date: '2026-06-26T21:00:00-06:00', venue: getStadium('Seattle'), city: 'Seattle', stage: 'group', group_name: 'G' },
  { external_id: '400021481', home_team: 'New Zealand', away_team: 'Belgium', home_team_flag: getFlag('NZL'), away_team_flag: getFlag('BEL'), match_date: '2026-06-26T21:00:00-06:00', venue: getStadium('Vancouver'), city: 'Vancouver', stage: 'group', group_name: 'G' },

  // ============= GROUP H (Spain, Cape Verde, Saudi Arabia, Uruguay) =============
  { external_id: '400021482', home_team: 'Spain', away_team: 'Cape Verde', home_team_flag: getFlag('ESP'), away_team_flag: getFlag('CPV'), match_date: '2026-06-15T10:00:00-06:00', venue: getStadium('Atlanta'), city: 'Atlanta', stage: 'group', group_name: 'H' },
  { external_id: '400021486', home_team: 'Saudi Arabia', away_team: 'Uruguay', home_team_flag: getFlag('KSA'), away_team_flag: getFlag('URU'), match_date: '2026-06-15T16:00:00-06:00', venue: getStadium('Miami'), city: 'Miami', stage: 'group', group_name: 'H' },
  { external_id: '400021483', home_team: 'Spain', away_team: 'Saudi Arabia', home_team_flag: getFlag('ESP'), away_team_flag: getFlag('KSA'), match_date: '2026-06-21T10:00:00-06:00', venue: getStadium('Atlanta'), city: 'Atlanta', stage: 'group', group_name: 'H' },
  { external_id: '400021487', home_team: 'Uruguay', away_team: 'Cape Verde', home_team_flag: getFlag('URU'), away_team_flag: getFlag('CPV'), match_date: '2026-06-21T16:00:00-06:00', venue: getStadium('Miami'), city: 'Miami', stage: 'group', group_name: 'H' },
  { external_id: '400021485', home_team: 'Cape Verde', away_team: 'Saudi Arabia', home_team_flag: getFlag('CPV'), away_team_flag: getFlag('KSA'), match_date: '2026-06-26T18:00:00-06:00', venue: getStadium('Houston'), city: 'Houston', stage: 'group', group_name: 'H' },
  { external_id: '400021484', home_team: 'Uruguay', away_team: 'Spain', home_team_flag: getFlag('URU'), away_team_flag: getFlag('ESP'), match_date: '2026-06-26T18:00:00-06:00', venue: getStadium('Guadalajara'), city: 'Guadalajara', stage: 'group', group_name: 'H' },

  // ============= GROUP I (France, Senegal, Iraq, Norway) =============
  { external_id: '400021490', home_team: 'France', away_team: 'Senegal', home_team_flag: getFlag('FRA'), away_team_flag: getFlag('SEN'), match_date: '2026-06-16T13:00:00-06:00', venue: getStadium('New York/New Jersey'), city: 'New York/New Jersey', stage: 'group', group_name: 'I' },
  { external_id: '400021488', home_team: 'Iraq', away_team: 'Norway', home_team_flag: getFlag('IRQ'), away_team_flag: getFlag('NOR'), match_date: '2026-06-16T16:00:00-06:00', venue: getStadium('Boston'), city: 'Boston', stage: 'group', group_name: 'I' },
  { external_id: '400021492', home_team: 'France', away_team: 'Iraq', home_team_flag: getFlag('FRA'), away_team_flag: getFlag('IRQ'), match_date: '2026-06-22T15:00:00-06:00', venue: getStadium('Philadelphia'), city: 'Philadelphia', stage: 'group', group_name: 'I' },
  { external_id: '400021491', home_team: 'Norway', away_team: 'Senegal', home_team_flag: getFlag('NOR'), away_team_flag: getFlag('SEN'), match_date: '2026-06-22T18:00:00-06:00', venue: getStadium('New York/New Jersey'), city: 'New York/New Jersey', stage: 'group', group_name: 'I' },
  { external_id: '400021489', home_team: 'Norway', away_team: 'France', home_team_flag: getFlag('NOR'), away_team_flag: getFlag('FRA'), match_date: '2026-06-26T13:00:00-06:00', venue: getStadium('Boston'), city: 'Boston', stage: 'group', group_name: 'I' },
  { external_id: '400021493', home_team: 'Senegal', away_team: 'Iraq', home_team_flag: getFlag('SEN'), away_team_flag: getFlag('IRQ'), match_date: '2026-06-26T13:00:00-06:00', venue: getStadium('Toronto'), city: 'Toronto', stage: 'group', group_name: 'I' },

  // ============= GROUP J (Argentina, Algeria, Austria, Jordan) =============
  { external_id: '400021496', home_team: 'Argentina', away_team: 'Algeria', home_team_flag: getFlag('ARG'), away_team_flag: getFlag('ALG'), match_date: '2026-06-16T19:00:00-06:00', venue: getStadium('Kansas City'), city: 'Kansas City', stage: 'group', group_name: 'J' },
  { external_id: '400021498', home_team: 'Austria', away_team: 'Jordan', home_team_flag: getFlag('AUT'), away_team_flag: getFlag('JOR'), match_date: '2026-06-16T22:00:00-06:00', venue: getStadium('San Francisco Bay Area'), city: 'San Francisco Bay Area', stage: 'group', group_name: 'J' },
  { external_id: '400021494', home_team: 'Argentina', away_team: 'Austria', home_team_flag: getFlag('ARG'), away_team_flag: getFlag('AUT'), match_date: '2026-06-22T11:00:00-06:00', venue: getStadium('Dallas'), city: 'Dallas', stage: 'group', group_name: 'J' },
  { external_id: '400021499', home_team: 'Jordan', away_team: 'Algeria', home_team_flag: getFlag('JOR'), away_team_flag: getFlag('ALG'), match_date: '2026-06-22T21:00:00-06:00', venue: getStadium('San Francisco Bay Area'), city: 'San Francisco Bay Area', stage: 'group', group_name: 'J' },
  { external_id: '400021497', home_team: 'Algeria', away_team: 'Austria', home_team_flag: getFlag('ALG'), away_team_flag: getFlag('AUT'), match_date: '2026-06-27T20:00:00-06:00', venue: getStadium('Kansas City'), city: 'Kansas City', stage: 'group', group_name: 'J' },
  { external_id: '400021495', home_team: 'Jordan', away_team: 'Argentina', home_team_flag: getFlag('JOR'), away_team_flag: getFlag('ARG'), match_date: '2026-06-27T20:00:00-06:00', venue: getStadium('Dallas'), city: 'Dallas', stage: 'group', group_name: 'J' },

  // ============= GROUP K (Portugal, Congo DR, Uzbekistan, Colombia) =============
  { external_id: '400021502', home_team: 'Portugal', away_team: 'Congo DR', home_team_flag: getFlag('POR'), away_team_flag: getFlag('COD'), match_date: '2026-06-17T11:00:00-06:00', venue: getStadium('Houston'), city: 'Houston', stage: 'group', group_name: 'K' },
  { external_id: '400021504', home_team: 'Uzbekistan', away_team: 'Colombia', home_team_flag: getFlag('UZB'), away_team_flag: getFlag('COL'), match_date: '2026-06-17T20:00:00-06:00', venue: getStadium('Mexico City'), city: 'Mexico City', stage: 'group', group_name: 'K' },
  { external_id: '400021503', home_team: 'Portugal', away_team: 'Uzbekistan', home_team_flag: getFlag('POR'), away_team_flag: getFlag('UZB'), match_date: '2026-06-23T11:00:00-06:00', venue: getStadium('Houston'), city: 'Houston', stage: 'group', group_name: 'K' },
  { external_id: '400021501', home_team: 'Colombia', away_team: 'Congo DR', home_team_flag: getFlag('COL'), away_team_flag: getFlag('COD'), match_date: '2026-06-23T20:00:00-06:00', venue: getStadium('Guadalajara'), city: 'Guadalajara', stage: 'group', group_name: 'K' },
  { external_id: '400021505', home_team: 'Colombia', away_team: 'Portugal', home_team_flag: getFlag('COL'), away_team_flag: getFlag('POR'), match_date: '2026-06-27T17:30:00-06:00', venue: getStadium('Miami'), city: 'Miami', stage: 'group', group_name: 'K' },
  { external_id: '400021500', home_team: 'Congo DR', away_team: 'Uzbekistan', home_team_flag: getFlag('COD'), away_team_flag: getFlag('UZB'), match_date: '2026-06-27T17:30:00-06:00', venue: getStadium('Atlanta'), city: 'Atlanta', stage: 'group', group_name: 'K' },

  // ============= GROUP L (England, Croatia, Ghana, Panama) =============
  { external_id: '400021507', home_team: 'England', away_team: 'Croatia', home_team_flag: getFlag('ENG'), away_team_flag: getFlag('CRO'), match_date: '2026-06-17T14:00:00-06:00', venue: getStadium('Dallas'), city: 'Dallas', stage: 'group', group_name: 'L' },
  { external_id: '400021510', home_team: 'Ghana', away_team: 'Panama', home_team_flag: getFlag('GHA'), away_team_flag: getFlag('PAN'), match_date: '2026-06-17T17:00:00-06:00', venue: getStadium('Toronto'), city: 'Toronto', stage: 'group', group_name: 'L' },
  { external_id: '400021506', home_team: 'England', away_team: 'Ghana', home_team_flag: getFlag('ENG'), away_team_flag: getFlag('GHA'), match_date: '2026-06-23T14:00:00-06:00', venue: getStadium('Boston'), city: 'Boston', stage: 'group', group_name: 'L' },
  { external_id: '400021511', home_team: 'Panama', away_team: 'Croatia', home_team_flag: getFlag('PAN'), away_team_flag: getFlag('CRO'), match_date: '2026-06-23T17:00:00-06:00', venue: getStadium('Toronto'), city: 'Toronto', stage: 'group', group_name: 'L' },
  { external_id: '400021508', home_team: 'Panama', away_team: 'England', home_team_flag: getFlag('PAN'), away_team_flag: getFlag('ENG'), match_date: '2026-06-27T15:00:00-06:00', venue: getStadium('New York/New Jersey'), city: 'New York/New Jersey', stage: 'group', group_name: 'L' },
  { external_id: '400021509', home_team: 'Croatia', away_team: 'Ghana', home_team_flag: getFlag('CRO'), away_team_flag: getFlag('GHA'), match_date: '2026-06-27T15:00:00-06:00', venue: getStadium('Philadelphia'), city: 'Philadelphia', stage: 'group', group_name: 'L' },

  // ============= ROUND OF 32 (16 matches) =============
  { external_id: '400021518', home_team: 'Runner-up Group A', away_team: 'Runner-up Group B', home_team_flag: null, away_team_flag: null, match_date: '2026-06-28T13:00:00-06:00', venue: getStadium('Los Angeles'), city: 'Los Angeles', stage: 'round_of_32', group_name: null },
  { external_id: '400021516', home_team: 'Winner Group C', away_team: 'Runner-up Group F', home_team_flag: null, away_team_flag: null, match_date: '2026-06-29T11:00:00-06:00', venue: getStadium('Houston'), city: 'Houston', stage: 'round_of_32', group_name: null },
  { external_id: '400021513', home_team: 'Winner Group E', away_team: 'Best 3rd Place (A/B/C/D/F)', home_team_flag: null, away_team_flag: null, match_date: '2026-06-29T14:30:00-06:00', venue: getStadium('Boston'), city: 'Boston', stage: 'round_of_32', group_name: null },
  { external_id: '400021522', home_team: 'Winner Group F', away_team: 'Runner-up Group C', home_team_flag: null, away_team_flag: null, match_date: '2026-06-29T19:00:00-06:00', venue: getStadium('Monterrey'), city: 'Monterrey', stage: 'round_of_32', group_name: null },
  { external_id: '400021514', home_team: 'Runner-up Group E', away_team: 'Runner-up Group I', home_team_flag: null, away_team_flag: null, match_date: '2026-06-30T11:00:00-06:00', venue: getStadium('Dallas'), city: 'Dallas', stage: 'round_of_32', group_name: null },
  { external_id: '400021523', home_team: 'Winner Group I', away_team: 'Best 3rd Place (C/D/F/G/H)', home_team_flag: null, away_team_flag: null, match_date: '2026-06-30T15:00:00-06:00', venue: getStadium('New York/New Jersey'), city: 'New York/New Jersey', stage: 'round_of_32', group_name: null },
  { external_id: '400021520', home_team: 'Winner Group A', away_team: 'Best 3rd Place (C/E/F/H/I)', home_team_flag: null, away_team_flag: null, match_date: '2026-06-30T19:00:00-06:00', venue: getStadium('Mexico City'), city: 'Mexico City', stage: 'round_of_32', group_name: null },
  { external_id: '400021512', home_team: 'Winner Group L', away_team: 'Best 3rd Place (E/H/I/J/K)', home_team_flag: null, away_team_flag: null, match_date: '2026-07-01T10:00:00-06:00', venue: getStadium('Atlanta'), city: 'Atlanta', stage: 'round_of_32', group_name: null },
  { external_id: '400021525', home_team: 'Winner Group G', away_team: 'Best 3rd Place (A/E/H/I/J)', home_team_flag: null, away_team_flag: null, match_date: '2026-07-01T14:00:00-06:00', venue: getStadium('Seattle'), city: 'Seattle', stage: 'round_of_32', group_name: null },
  { external_id: '400021524', home_team: 'Winner Group D', away_team: 'Best 3rd Place (B/E/F/I/J)', home_team_flag: null, away_team_flag: null, match_date: '2026-07-01T18:00:00-06:00', venue: getStadium('San Francisco Bay Area'), city: 'San Francisco Bay Area', stage: 'round_of_32', group_name: null },
  { external_id: '400021519', home_team: 'Winner Group H', away_team: 'Runner-up Group J', home_team_flag: null, away_team_flag: null, match_date: '2026-07-02T13:00:00-06:00', venue: getStadium('Los Angeles'), city: 'Los Angeles', stage: 'round_of_32', group_name: null },
  { external_id: '400021526', home_team: 'Runner-up Group K', away_team: 'Runner-up Group L', home_team_flag: null, away_team_flag: null, match_date: '2026-07-02T17:00:00-06:00', venue: getStadium('Toronto'), city: 'Toronto', stage: 'round_of_32', group_name: null },
  { external_id: '400021527', home_team: 'Winner Group B', away_team: 'Best 3rd Place (E/F/G/I/J)', home_team_flag: null, away_team_flag: null, match_date: '2026-07-02T21:00:00-06:00', venue: getStadium('Vancouver'), city: 'Vancouver', stage: 'round_of_32', group_name: null },
  { external_id: '400021515', home_team: 'Runner-up Group D', away_team: 'Runner-up Group G', home_team_flag: null, away_team_flag: null, match_date: '2026-07-03T12:00:00-06:00', venue: getStadium('Dallas'), city: 'Dallas', stage: 'round_of_32', group_name: null },
  { external_id: '400021521', home_team: 'Winner Group J', away_team: 'Runner-up Group H', home_team_flag: null, away_team_flag: null, match_date: '2026-07-03T16:00:00-06:00', venue: getStadium('Miami'), city: 'Miami', stage: 'round_of_32', group_name: null },
  { external_id: '400021517', home_team: 'Winner Group K', away_team: 'Best 3rd Place (D/E/I/J/L)', home_team_flag: null, away_team_flag: null, match_date: '2026-07-03T19:30:00-06:00', venue: getStadium('Kansas City'), city: 'Kansas City', stage: 'round_of_32', group_name: null },

  // ============= ROUND OF 16 (8 matches) =============
  { external_id: '400021530', home_team: 'Winner Match 73', away_team: 'Winner Match 75', home_team_flag: null, away_team_flag: null, match_date: '2026-07-04T11:00:00-06:00', venue: getStadium('Houston'), city: 'Houston', stage: 'round_of_16', group_name: null },
  { external_id: '400021533', home_team: 'Winner Match 74', away_team: 'Winner Match 77', home_team_flag: null, away_team_flag: null, match_date: '2026-07-04T15:00:00-06:00', venue: getStadium('Philadelphia'), city: 'Philadelphia', stage: 'round_of_16', group_name: null },
  { external_id: '400021532', home_team: 'Winner Match 76', away_team: 'Winner Match 78', home_team_flag: null, away_team_flag: null, match_date: '2026-07-05T14:00:00-06:00', venue: getStadium('New York/New Jersey'), city: 'New York/New Jersey', stage: 'round_of_16', group_name: null },
  { external_id: '400021531', home_team: 'Winner Match 79', away_team: 'Winner Match 80', home_team_flag: null, away_team_flag: null, match_date: '2026-07-05T18:00:00-06:00', venue: getStadium('Mexico City'), city: 'Mexico City', stage: 'round_of_16', group_name: null },
  { external_id: '400021529', home_team: 'Winner Match 83', away_team: 'Winner Match 84', home_team_flag: null, away_team_flag: null, match_date: '2026-07-06T13:00:00-06:00', venue: getStadium('Dallas'), city: 'Dallas', stage: 'round_of_16', group_name: null },
  { external_id: '400021534', home_team: 'Winner Match 81', away_team: 'Winner Match 82', home_team_flag: null, away_team_flag: null, match_date: '2026-07-06T18:00:00-06:00', venue: getStadium('Seattle'), city: 'Seattle', stage: 'round_of_16', group_name: null },
  { external_id: '400021528', home_team: 'Winner Match 86', away_team: 'Winner Match 88', home_team_flag: null, away_team_flag: null, match_date: '2026-07-07T10:00:00-06:00', venue: getStadium('Atlanta'), city: 'Atlanta', stage: 'round_of_16', group_name: null },
  { external_id: '400021535', home_team: 'Winner Match 85', away_team: 'Winner Match 87', home_team_flag: null, away_team_flag: null, match_date: '2026-07-07T14:00:00-06:00', venue: getStadium('Vancouver'), city: 'Vancouver', stage: 'round_of_16', group_name: null },

  // ============= QUARTER FINALS (4 matches) =============
  { external_id: '400021536', home_team: 'Winner Match 89', away_team: 'Winner Match 90', home_team_flag: null, away_team_flag: null, match_date: '2026-07-09T14:00:00-06:00', venue: getStadium('Boston'), city: 'Boston', stage: 'quarter_final', group_name: null },
  { external_id: '400021538', home_team: 'Winner Match 93', away_team: 'Winner Match 94', home_team_flag: null, away_team_flag: null, match_date: '2026-07-10T13:00:00-06:00', venue: getStadium('Los Angeles'), city: 'Los Angeles', stage: 'quarter_final', group_name: null },
  { external_id: '400021539', home_team: 'Winner Match 91', away_team: 'Winner Match 92', home_team_flag: null, away_team_flag: null, match_date: '2026-07-11T15:00:00-06:00', venue: getStadium('Miami'), city: 'Miami', stage: 'quarter_final', group_name: null },
  { external_id: '400021537', home_team: 'Winner Match 95', away_team: 'Winner Match 96', home_team_flag: null, away_team_flag: null, match_date: '2026-07-11T19:00:00-06:00', venue: getStadium('Kansas City'), city: 'Kansas City', stage: 'quarter_final', group_name: null },

  // ============= SEMI FINALS (2 matches) =============
  { external_id: '400021541', home_team: 'Winner Match 97', away_team: 'Winner Match 98', home_team_flag: null, away_team_flag: null, match_date: '2026-07-14T13:00:00-06:00', venue: getStadium('Dallas'), city: 'Dallas', stage: 'semi_final', group_name: null },
  { external_id: '400021540', home_team: 'Winner Match 99', away_team: 'Winner Match 100', home_team_flag: null, away_team_flag: null, match_date: '2026-07-15T13:00:00-06:00', venue: getStadium('Atlanta'), city: 'Atlanta', stage: 'semi_final', group_name: null },

  // ============= THIRD PLACE (1 match) =============
  { external_id: '400021542', home_team: 'Loser Match 101', away_team: 'Loser Match 102', home_team_flag: null, away_team_flag: null, match_date: '2026-07-18T15:00:00-06:00', venue: getStadium('Miami'), city: 'Miami', stage: 'third_place', group_name: null },

  // ============= FINAL (1 match) =============
  { external_id: '400021543', home_team: 'Winner Match 101', away_team: 'Winner Match 102', home_team_flag: null, away_team_flag: null, match_date: '2026-07-19T13:00:00-06:00', venue: getStadium('New York/New Jersey'), city: 'New York/New Jersey', stage: 'final', group_name: null },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    // Authentication check - require valid admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep("Authentication failed", { error: claimsError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    logStep("User authenticated", { userId });

    // Admin role check using service role client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      logStep("Admin check failed", { userId, hasRole: !!adminRole });
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep('Admin verified, starting International Football Tournament 2026 sync...');
    logStep(`Total matches to sync: ${predefinedMatches.length}`);

    // Count matches by stage
    const stageCounts = predefinedMatches.reduce((acc, m) => {
      acc[m.stage] = (acc[m.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Matches by stage:', JSON.stringify(stageCounts));

    // Upsert matches using external_id
    const { data: upsertData, error: upsertError } = await supabase
      .from('matches')
      .upsert(
        predefinedMatches.map(m => ({
          external_id: m.external_id,
          home_team: m.home_team,
          away_team: m.away_team,
          home_team_flag: m.home_team_flag,
          away_team_flag: m.away_team_flag,
          match_date: m.match_date,
          venue: m.venue,
          city: m.city,
          stage: m.stage,
          group_name: m.group_name,
          status: 'scheduled',
        })),
        { onConflict: 'external_id' }
      );

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }

    console.log(`Successfully synced ${predefinedMatches.length} matches`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${predefinedMatches.length} International Football Tournament 2026 matches`,
        synced: predefinedMatches.length,
        breakdown: stageCounts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
