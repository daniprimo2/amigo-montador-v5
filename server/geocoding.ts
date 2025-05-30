import axios from 'axios';

interface GeocodeResult {
  latitude: string;
  longitude: string;
}

/**
 * Converte CEP em coordenadas geográficas usando APIs públicas brasileiras
 */
export async function geocodeFromCEP(cep: string): Promise<GeocodeResult> {
  const cleanCep = cep.replace(/\D/g, '');
  
  if (cleanCep.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }

  try {
    // Primeira tentativa: API do ViaCEP com coordenadas aproximadas
    const viacepResponse = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);
    
    if (viacepResponse.data.erro) {
      throw new Error('CEP não encontrado');
    }

    const { localidade, uf } = viacepResponse.data;
    
    // Segunda chamada: Buscar coordenadas da cidade usando API do IBGE
    const ibgeResponse = await axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios`);
    const cities = ibgeResponse.data;
    
    const city = cities.find((c: any) => 
      c.nome.toLowerCase() === localidade.toLowerCase() && 
      c.microrregiao.mesorregiao.UF.sigla === uf
    );

    if (city) {
      // Usar coordenadas aproximadas do centro da cidade
      const lat = city.latitude || getCityCoordinates(localidade, uf).lat;
      const lng = city.longitude || getCityCoordinates(localidade, uf).lng;
      
      return {
        latitude: lat.toString(),
        longitude: lng.toString()
      };
    }

    // Fallback: coordenadas aproximadas baseadas na cidade
    const coords = getCityCoordinates(localidade, uf);
    return {
      latitude: coords.lat.toString(),
      longitude: coords.lng.toString()
    };

  } catch (error) {
    console.error('Erro na geocodificação:', error);
    throw new Error('Não foi possível obter coordenadas para este CEP');
  }
}

/**
 * Coordenadas aproximadas das principais cidades brasileiras
 */
export function getCityCoordinates(city: string, state: string): { lat: number; lng: number } {
  const cityCoords: Record<string, { lat: number; lng: number }> = {
    // Capitais e principais cidades
    'São Paulo-SP': { lat: -23.5505, lng: -46.6333 },
    'Rio de Janeiro-RJ': { lat: -22.9068, lng: -43.1729 },
    'Belo Horizonte-MG': { lat: -19.9191, lng: -43.9386 },
    'Brasília-DF': { lat: -15.7801, lng: -47.9292 },
    'Salvador-BA': { lat: -12.9714, lng: -38.5014 },
    'Fortaleza-CE': { lat: -3.7319, lng: -38.5267 },
    'Recife-PE': { lat: -8.0476, lng: -34.8770 },
    'Porto Alegre-RS': { lat: -30.0346, lng: -51.2177 },
    'Curitiba-PR': { lat: -25.4284, lng: -49.2733 },
    'Manaus-AM': { lat: -3.1190, lng: -60.0217 },
    'Belém-PA': { lat: -1.4558, lng: -48.5044 },
    'Goiânia-GO': { lat: -16.6869, lng: -49.2648 },
    'Campinas-SP': { lat: -22.9099, lng: -47.0626 },
    'São Bernardo do Campo-SP': { lat: -23.6914, lng: -46.5646 },
    'Guarulhos-SP': { lat: -23.4538, lng: -46.5333 },
    'Nova Iguaçu-RJ': { lat: -22.7591, lng: -43.4509 },
    'São Gonçalo-RJ': { lat: -22.8267, lng: -43.0537 },
    'Duque de Caxias-RJ': { lat: -22.7856, lng: -43.3117 },
    'Natal-RN': { lat: -5.7945, lng: -35.2110 },
    'Maceió-AL': { lat: -9.6658, lng: -35.7353 },
    'Campo Grande-MS': { lat: -20.4697, lng: -54.6201 },
    'João Pessoa-PB': { lat: -7.1195, lng: -34.8450 },
    'Teresina-PI': { lat: -5.0892, lng: -42.8019 },
    'São Luís-MA': { lat: -2.5297, lng: -44.3028 },
    'Aracaju-SE': { lat: -10.9472, lng: -37.0731 },
    'Cuiabá-MT': { lat: -15.6014, lng: -56.0979 },
    'Florianópolis-SC': { lat: -27.5954, lng: -48.5480 },
    'Vitória-ES': { lat: -20.3155, lng: -40.3128 },
    'Palmas-TO': { lat: -10.1689, lng: -48.3317 },
    'Macapá-AP': { lat: 0.0389, lng: -51.0664 },
    'Boa Vista-RR': { lat: 2.8235, lng: -60.6758 },
    'Rio Branco-AC': { lat: -9.9755, lng: -67.8243 }
  };

  const key = `${city}-${state}`;
  
  if (cityCoords[key]) {
    return cityCoords[key];
  }

  // Coordenadas aproximadas por estado (centro geográfico)
  const stateCoords: Record<string, { lat: number; lng: number }> = {
    'AC': { lat: -8.77, lng: -70.55 },
    'AL': { lat: -9.71, lng: -35.73 },
    'AP': { lat: 1.41, lng: -51.77 },
    'AM': { lat: -3.07, lng: -61.66 },
    'BA': { lat: -12.96, lng: -38.51 },
    'CE': { lat: -3.71, lng: -38.54 },
    'DF': { lat: -15.83, lng: -47.86 },
    'ES': { lat: -19.19, lng: -40.34 },
    'GO': { lat: -16.64, lng: -49.31 },
    'MA': { lat: -2.55, lng: -44.30 },
    'MT': { lat: -12.64, lng: -55.42 },
    'MS': { lat: -20.51, lng: -54.54 },
    'MG': { lat: -18.10, lng: -44.38 },
    'PA': { lat: -5.53, lng: -52.29 },
    'PB': { lat: -7.06, lng: -35.55 },
    'PR': { lat: -24.89, lng: -51.55 },
    'PE': { lat: -8.28, lng: -35.07 },
    'PI': { lat: -8.28, lng: -45.24 },
    'RJ': { lat: -22.84, lng: -43.15 },
    'RN': { lat: -5.22, lng: -36.52 },
    'RS': { lat: -30.01, lng: -51.22 },
    'RO': { lat: -11.22, lng: -62.80 },
    'RR': { lat: 1.89, lng: -61.22 },
    'SC': { lat: -27.33, lng: -49.44 },
    'SP': { lat: -23.55, lng: -46.64 },
    'SE': { lat: -10.90, lng: -37.07 },
    'TO': { lat: -10.25, lng: -48.25 }
  };

  return stateCoords[state] || { lat: -14.235, lng: -51.9253 }; // Centro do Brasil como fallback
}

/**
 * Calcula a distância entre duas coordenadas em quilômetros usando a fórmula de Haversine
 */
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}