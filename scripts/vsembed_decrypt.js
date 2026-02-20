
import crypto from 'crypto';

// Logic extracted from vsembed_source.html

const t = (t, r) => {
    const n = r.length / 2;
    const e = r.substr(0, n);
    const i = r.substr(n);
    return JSON.parse(t.split('').map((t => {
        const r = i.indexOf(t);
        return -1 !== r ? e[r] : t
    })).join(''))
};

// The encrypted payload and key from the HTML
const payload = '{\"f\":{\"mi\":\".u08\",\"mif\":\"Ghx\",\"mh\":\".olfm\",\"mhf\":\"Gh2\",\"8\":\".uqa9\",\"8f\":\"Gh5\"},\"y\":\"\\/s{oc8}\\/VgMoO\"}';
const key = 'abcdefghijklmnopqrstuvwxyz01234567896eu8l0d71wsytcavkofm9gr4q3zihnbx25pj';

const m = t(payload, key);
console.log("Decrypted m:", m);

const { l: S, s: A, d: T } = m;
const { t1: O, t2: j, d: E, t1s: L, t2s: M, ds: _ } = A;

console.log("Extracted variables:");
console.log("S (l):", S);
console.log("A (s):", A);
console.log("T (d):", T);
console.log("O (t1):", O);
console.log("j (t2):", j);
console.log("L (t1s):", L);
console.log("M (t2s):", M);


// Mocking the 'y' and 'g' functions from the source to fully reconstruct the URL
const d = 'BCEFGHIJKLMNOPQRTUVWXYZ123456789';

async function sha256(str) {
    const hash = crypto.createHash('sha256');
    hash.update(str);
    return hash.digest(); // returns Buffer/Uint8Array
}

async function yy(t, r, n) {
    const now = new Date();
    const e = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
    const i = Math.floor(e.getUTCHours() / n) * n;

    const o = `${e.getUTCFullYear()}${String(e.getUTCMonth() + 1).padStart(2, '0')}${String(e.getUTCDate()).padStart(2, '0')}${String(i).padStart(2, '0')}`;

    const a = `${t}|${o}`;

    const c = await sha256(a); // Buffer

    const f = 15 + c[0] % 26;
    const v = 1 + c[1] % (f - 14);
    const s = f - v;

    const l = (t => {
        let r = 0, n = '', e = 0;
        for (let i = 0; i < t.length; i++)
            for (e = e << 8 | t[i], r += 8; r >= 5;) n += d[e >>> r - 5 & 31], r -= 5;
        return r && (n += d[e << 5 - r & 31]), n.toLowerCase()
    })(c);

    return `${l.slice(0, v)}.${l.slice(v, v + s)}`;
}

async function g(t) {
    let { tld: r, s: n, offset: e = 3, now: i, l: o } = t;
    console.log("DEBUG: g() called. tld (r):", r);
    const domain = await yy(n, i, e);
    console.log("DEBUG: Generated domain:", domain);

    const path = o.replace(/\{rnd\}/g, (() => {
        return (t => {
            let r_inner = '';
            for (let n = 0; n < t; n += 1) {
                let t = d[Math.floor(Math.random() * d.length)];
                /^[A-Z]$/.test(t) && Math.random() < .5 && (t = t.toLowerCase()), r_inner += t
            }
            return r_inner
        })((t = 10, /*r=24 implicitly unused in assignment but causing side effect*/ Math.floor(Math.random() * (24 - 10 + 1)) + 10));
    }));

    const finalUrl = `https://${domain}${r}${path}`;
    console.log("DEBUG: Final URL constructed:", finalUrl);
    return finalUrl;
}

(async () => {
    try {
        const R = new Date(); // now
        const url1 = await g({ l: S, tld: O, s: L, now: R });
        const url2 = await g({ l: S, tld: j, s: M, now: R });

        console.log("Generated URL 1:", url1);
        console.log("Generated URL 2:", url2);
    } catch (e) {
        console.error(e);
    }
})();
