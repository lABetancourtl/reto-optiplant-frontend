import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem('authToken');

  if (req.url.includes('/transfers/inbound')) {
    console.log('[AuthInterceptor][Inbound]', {
      url: req.url,
      hasAuthorizationHeader: !!token
    });
  }
  
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }
  
  return next(req);
};