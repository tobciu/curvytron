/** Url of a file of the `public/` directory, relative to the page (the game may be served from a sub path). */
export function asset(path: string): string {
    return `${import.meta.env.BASE_URL}${path}`;
}
