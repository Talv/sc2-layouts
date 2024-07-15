import * as fs from 'fs';
import * as util from 'util';
import { glob, GlobOptions } from 'glob';
import { CharacterCodes } from './parser/scanner';

export const readFileAsync = util.promisify(fs.readFile);
export const readDirAsync = util.promisify(fs.readdir);
export const fileExistsAsync = util.promisify(fs.exists);

/**
 * Takes a sorted array and a function p. The array is sorted in such a way that all elements where p(x) is false
 * are located before all elements where p(x) is true.
 * @returns the least x for which p(x) is true or array.length if no element fullfills the given function.
 */
export function findFirst<T>(array: T[], p: (x: T) => boolean): number {
    let low = 0, high = array.length;
    if (high === 0) {
        return 0; // no children
    }
    while (low < high) {
        let mid = Math.floor((low + high) / 2);
        if (p(array[mid])) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}

export function binarySearch<T>(array: T[], key: T, comparator: (op1: T, op2: T) => number): number {
    let low = 0,
        high = array.length - 1;

    while (low <= high) {
        let mid = ((low + high) / 2) | 0;
        let comp = comparator(array[mid], key);
        if (comp < 0) {
            low = mid + 1;
        } else if (comp > 0) {
            high = mid - 1;
        } else {
            return mid;
        }
    }
    return -(low + 1);
}

//

export function buildMap<T>(obj: {[name: string]: T}) {
    return Object.keys(obj).reduce((map, key) => map.set(key, obj[key]), new Map<string, T>());
}

export function* oentries<T>(obj: T[]) {
    for (const key in obj) {
        yield obj[key];
    }
}

export function* objventries<T>(obj: {[name: string]: T}): Iterable<[string, T]> {
    for (const key in obj) {
        yield [key, obj[key]];
    }
}

export function *reverseMap<T>(source: ReadonlyMap<string, T>): Iterable<[T, string]> {
    const result: string[] = [];
    for (const [k, v] of source.entries()) {
        yield [v, k];
    }
}

export function fuzzysearch (needle: string, haystack: string) {
    let hlen = haystack.length;
    let nlen = needle.length;
    if (nlen > hlen) {
        return false;
    }
    if (nlen === hlen && needle === haystack) {
        return true;
    }
    outer: for (let i = 0, j = 0; i < nlen; i++) {
        let nch = needle.charCodeAt(i);
        while (j < hlen) {
            let hch = haystack.charCodeAt(j++);

            // case sensitive
            if (hch === nch) {
                continue outer;
            }

            // try case insensitive
            if (nch >= 65 && nch <= 90) {
                nch += 32;
            }
            else if (nch >= 97 && nch <= 122) {
                nch -= 32;
            }
            else {
                switch (nch) {
                    case CharacterCodes.space:
                    // case CharacterCodes.slash:
                    // case CharacterCodes.backslash:
                    // case CharacterCodes.minus:
                    // case CharacterCodes._:
                        continue outer;
                }

                continue;
            }
            if (hch === nch) {
                continue outer;
            }
        }
        return false;
    }
    return true;
}

export function globify(pattern: string, opts?: GlobOptions) {
    return glob(pattern, { ...opts, ...{ withFileTypes: false } });
}

export function dlog(o: any, opts: util.InspectOptions = {}) {
    console.log(util.inspect(o, Object.assign({
        colors: true,
        compact: false,
        depth: 6,
    }, opts)));
}

export class StringIcaseMap<T> extends Map<string, T> {
    protected readonly lcaseMap = new Map<string, T>();

    clear() {
        super.clear();
        this.lcaseMap.clear();
    }

    set(key: string, value: T) {
        this.lcaseMap.set(key.toLowerCase(), value);
        return super.set(key, value);
    }

    get(key: string): T | undefined {
        let r = super.get(key);
        if (!r) {
            r = this.lcaseMap.get(key.toLowerCase());
        }
        return r;
    }

    getStrictCase(key: string): T | undefined {
        return super.get(key);
    }

    has(key: string): boolean {
        let r = super.has(key);
        if (!r) {
            r = this.lcaseMap.has(key.toLowerCase());
        }
        return r;
    }

    delete(key: string): boolean {
        let r = super.delete(key);
        if (r) {
            this.lcaseMap.delete(key.toLowerCase());
        }
        return r;
    }
}
