import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export const useActivityTracker = (isAuthenticated) => {
  const location = useLocation();
  const sessionIdRef = useRef(null);

  // Initialize or get session ID
  if (!sessionIdRef.current) {
    let sid = sessionStorage.getItem('studybuddy_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      sessionStorage.setItem('studybuddy_session_id', sid);
    }
    sessionIdRef.current = sid;
  }

  // Determine activity type based on path
  const getActivityType = (pathname) => {
    if (pathname.startsWith('/test/')) return 'test';
    if (pathname === '/practice' || pathname === '/generate') return 'practice';
    if (pathname === '/chat') return 'chat';
    return 'general';
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const sendHeartbeat = async () => {
      // Only track if tab is active and visible
      if (document.visibilityState === 'hidden') return;

      try {
        await api.post('/activity/heartbeat', {
          sessionId: sessionIdRef.current,
          activityType: getActivityType(location.pathname),
          durationSeconds: 30
        });
      } catch (err) {
        // silent fail on network interruption
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Periodic heartbeat every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, location.pathname]);
};

export default useActivityTracker;
