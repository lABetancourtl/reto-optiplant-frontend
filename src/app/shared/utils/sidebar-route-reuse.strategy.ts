import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy
} from '@angular/router';

export class SidebarRouteReuseStrategy implements RouteReuseStrategy {
  private storedHandles = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return this.isCacheableSidebarRoute(route);
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (!handle) {
      return;
    }

    const key = this.buildRouteKey(route);
    if (key) {
      this.storedHandles.set(key, handle);
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = this.buildRouteKey(route);
    return !!key && this.storedHandles.has(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.buildRouteKey(route);
    if (!key) {
      return null;
    }

    return this.storedHandles.get(key) ?? null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  private isCacheableSidebarRoute(route: ActivatedRouteSnapshot): boolean {
    if (!route.routeConfig?.path) {
      return false;
    }

    const hasRouteParams = route.paramMap.keys.length > 0;
    const hasPathParams = route.routeConfig.path.includes(':');
    if (hasRouteParams || hasPathParams) {
      return false;
    }

    const fullPath = this.getFullPath(route);
    return fullPath.startsWith('admin/') || fullPath.startsWith('sucursal/');
  }

  private buildRouteKey(route: ActivatedRouteSnapshot): string | null {
    const fullPath = this.getFullPath(route);
    return fullPath || null;
  }

  private getFullPath(route: ActivatedRouteSnapshot): string {
    return route.pathFromRoot
      .map((snapshot) => snapshot.routeConfig?.path)
      .filter((path): path is string => !!path && path.length > 0)
      .join('/');
  }
}