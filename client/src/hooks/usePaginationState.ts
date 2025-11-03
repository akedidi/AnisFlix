import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'paginationState';
const SESSION_KEY = 'paginationLast';

function readStorage(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {} as any;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {} as any;
  }
}

function readSession(): Record<string, number> {
  if (typeof sessionStorage === 'undefined') return {} as any;
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {} as any;
  }
}

function writeSession(obj: Record<string, number>) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
  } catch {}
}

function writeStorage(obj: Record<string, number>) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

export function usePaginationState(key?: string, initialPage = 1) {
  // Use pathname only (without search params) as route key for storage
  const routeKey = useMemo(() => key || (typeof window !== 'undefined' ? window.location.pathname : 'default'), [key]);
  
  // Read page from URL
  const getPageFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return initialPage;
    const sp = new URLSearchParams(window.location.search);
    const qp = parseInt(sp.get('page') || '');
    if (!Number.isNaN(qp) && qp > 0) return qp;
    return initialPage;
  }, [initialPage]);

  // Helper to save page immediately
  const savePageToStorage = useCallback((pageNum: number, route: string) => {
    try {
      const store = readStorage();
      store[route] = pageNum;
      writeStorage(store);
      console.log('[PaginationState] ✅ Saved page to storage:', { route, page: pageNum, fullStore: store });
      const sess = readSession();
      sess[route] = pageNum;
      writeSession(sess);
    } catch (err) {
      console.error('[PaginationState] ❌ Error saving to storage:', err);
    }
  }, []);

  const [page, setPage] = useState<number>(() => {
    // Calculate routeKey here directly (can't use the memoized one in initializer)
    const currentRouteKey = key || (typeof window !== 'undefined' ? window.location.pathname : 'default');
    
    // Try URL first
    const urlPage = typeof window !== 'undefined' 
      ? (() => {
          const sp = new URLSearchParams(window.location.search);
          const qp = parseInt(sp.get('page') || '');
          return (!Number.isNaN(qp) && qp > 0) ? qp : initialPage;
        })()
      : initialPage;
    
    // If URL has no page param, try localStorage
    if (urlPage === initialPage) {
      const store = readStorage();
      const sess = readSession();
      console.log('[PaginationState] 🔍 Checking storage on mount:', { routeKey: currentRouteKey, local: store, session: sess });
      const stored = store[currentRouteKey] ?? sess[currentRouteKey];
      if (typeof stored === 'number' && stored > 0) {
        console.log('[PaginationState] ✅ Restored from localStorage:', { routeKey: currentRouteKey, stored, url: typeof window !== 'undefined' ? window.location.href : 'N/A' });
        return stored;
      } else {
        console.log('[PaginationState] ❌ No stored page found in localStorage for routeKey:', currentRouteKey);
      }
    }
    console.log('[PaginationState] 📄 Using URL/default:', { routeKey: currentRouteKey, initial: urlPage, url: typeof window !== 'undefined' ? window.location.href : 'N/A' });
    return urlPage;
  });

  // Persist to storage and update URL when page changes
  useEffect(() => {
    console.log('[PaginationState] Page changed:', { routeKey, page });
    
    // Save immediately to localStorage
    savePageToStorage(page, routeKey);
    
    // Also save before leaving the page (for navigation via window.location.href)
    if (typeof window !== 'undefined') {
      const handleBeforeUnload = () => {
        savePageToStorage(page, routeKey);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Update URL without adding history entry
      try {
        const url = new URL(window.location.href);
        const currentPageParam = url.searchParams.get('page');
        if (page === 1) {
          if (currentPageParam) {
            url.searchParams.delete('page');
            window.history.replaceState({ ...window.history.state, __page: page }, document.title, url.toString());
          }
        } else {
          if (currentPageParam !== String(page)) {
            url.searchParams.set('page', String(page));
            window.history.replaceState({ ...window.history.state, __page: page }, document.title, url.toString());
          }
        }
      } catch (err) {
        console.error('[PaginationState] Error updating URL:', err);
      }
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // Save one last time on cleanup
        savePageToStorage(page, routeKey);
      };
    }
  }, [routeKey, page, savePageToStorage]);

  // Listen to browser back/forward
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const onPopState = (e: PopStateEvent) => {
      // Read current routeKey (might have changed after navigation)
      const currentRouteKey = key || (typeof window !== 'undefined' ? window.location.pathname : 'default');
      const urlPage = getPageFromUrl();
      
      console.log('[PaginationState] 🔄 PopState event:', { 
        state: e.state, 
        url: window.location.href,
        search: window.location.search,
        routeKey: currentRouteKey,
        urlPage
      });
      
      // If URL has page param, use it
      if (urlPage !== initialPage && urlPage !== page) {
        console.log('[PaginationState] ✅ PopState: Restoring from URL:', { from: page, to: urlPage });
        setPage(urlPage);
      } else if (urlPage === initialPage) {
        // If URL has no page param, try localStorage
        const store = readStorage();
        console.log('[PaginationState] 🔍 PopState: checking localStorage:', { routeKey: currentRouteKey, fullStore: store });
        const stored = store[currentRouteKey];
        if (typeof stored === 'number' && stored > 0 && stored !== page) {
          console.log('[PaginationState] ✅ PopState: Restoring from localStorage:', { from: page, to: stored, routeKey: currentRouteKey });
          setPage(stored);
        } else {
          console.log('[PaginationState] ❌ PopState: No stored page found in localStorage for routeKey:', currentRouteKey);
        }
      }
    };
    
    window.addEventListener('popstate', onPopState);
    console.log('[PaginationState] Added popstate listener for routeKey:', routeKey);
    
    return () => {
      window.removeEventListener('popstate', onPopState);
      console.log('[PaginationState] Removed popstate listener');
    };
  }, [page, getPageFromUrl, initialPage, key]);

  // When route changes, restore from URL first, then storage
  const routeKeyRef = useRef(routeKey);
  useEffect(() => {
    // Only restore if route actually changed
    if (routeKeyRef.current !== routeKey) {
      routeKeyRef.current = routeKey;
      const urlPage = getPageFromUrl();
      console.log('[PaginationState] Route changed:', { routeKey, urlPage, currentPage: page });
      
      // If URL has page param and it's different, use it
      if (urlPage !== initialPage && urlPage !== page) {
        console.log('[PaginationState] Restoring from URL:', urlPage);
        setPage(urlPage);
        return;
      }
      
      // If URL has no page param (or is page 1), try storage
      if (urlPage === initialPage) {
        const store = readStorage();
        const stored = store[routeKey];
        if (typeof stored === 'number' && stored > 0 && stored !== page) {
          console.log('[PaginationState] Restoring from storage (URL has no page param):', stored);
          setPage(stored);
        }
      }
    }
  }, [routeKey, initialPage, getPageFromUrl, page]);

  const onPageChange = useCallback((next: number) => {
    console.log('[PaginationState] onPageChange called:', { from: page, to: next, routeKey });
    
    // Save immediately BEFORE updating state
    savePageToStorage(next, routeKey);
    
    setPage(next);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (next === 1) {
          url.searchParams.delete('page');
        } else {
          url.searchParams.set('page', String(next));
        }
        // Push state to create history entry for back button
        window.history.pushState({ ...window.history.state, __page: next }, document.title, url.toString());
        console.log('[PaginationState] Pushed to history:', url.toString());
      } catch (err) {
        console.error('[PaginationState] Error pushing to history:', err);
      }
    }
  }, [page, routeKey, savePageToStorage]);

  return { page, setPage, onPageChange } as const;
}


