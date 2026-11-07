import { useSyncExternalStore, type ComponentPropsWithRef } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => {
    const query = new URLSearchParams(window.location.search);
    return query.has("archive")
      ? `/archive/${query.get("archive")}`
      : `/${query.get("page") ?? ""}`;
  });
}

export function demoHref(href: string) {
  if (!href.startsWith("/")) return href;
  const [path, hash] = href.split("#");
  const query = new URLSearchParams();
  if (path.startsWith("/archive/")) query.set("archive", path.slice(9));
  else if (path !== "/") query.set("page", path.slice(1));
  return `./${query.size ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

export default function Link({
  href = "",
  onClick,
  ...props
}: ComponentPropsWithRef<"a">) {
  return (
    <a
      {...props}
      href={demoHref(href)}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank" ||
          !href.startsWith("/")
        )
          return;
        event.preventDefault();
        const previousPath = window.location.search;
        history.pushState(null, "", demoHref(href));
        window.dispatchEvent(new PopStateEvent("popstate"));
        requestAnimationFrame(() => {
          const id = window.location.hash.slice(1);
          if (id) document.getElementById(id)?.scrollIntoView();
          else if (previousPath !== window.location.search) {
            window.scrollTo(0, 0);
            document.getElementById("main")?.focus({ preventScroll: true });
          }
        });
      }}
    />
  );
}
