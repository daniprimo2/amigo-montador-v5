import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 300000, // 5 minutes
    watch = false,
  } = options;

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation não é suportada neste navegador',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const positionOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      let errorMessage = 'Erro desconhecido ao obter localização';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Permissão de localização negada';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Localização indisponível';
          break;
        case error.TIMEOUT:
          errorMessage = 'Tempo limite excedido para obter localização';
          break;
      }

      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    };

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        positionOptions
      );
      return watchId;
    } else {
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        onError,
        positionOptions
      );
    }
  }, [enableHighAccuracy, timeout, maximumAge, watch]);

  useEffect(() => {
    let watchId: number | undefined;

    if (watch) {
      watchId = getCurrentPosition() as number;
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [getCurrentPosition, watch]);

  const calculateDistance = useCallback((lat2: number, lon2: number) => {
    if (!state.latitude || !state.longitude) return null;

    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - state.latitude) * Math.PI / 180;
    const dLon = (lon2 - state.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(state.latitude * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }, [state.latitude, state.longitude]);

  return {
    ...state,
    getCurrentPosition,
    calculateDistance,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}