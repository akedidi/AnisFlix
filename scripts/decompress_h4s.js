
import zlib from 'zlib';
import { Buffer } from 'buffer';

const payload = "H4sIAAAAAAAAAw3H0ZKCIBQA0F8Szd11H6nQsaBCuARvCJajsDnpTG5fv3veTtYWuS1u6NalFqVfub.lXbFBnf9wn50r8m9GyMFHKF3lsY_T0CK5QvlILNRvOkBuldnSCppmF15d7IkpL08_hFnuYTkkSaIim9t9L1ycMzuOL60mA8GMXeRKA0O8qhsn.BbiQiHTWSfvTyGXoxtMkFeDQbJFBoNMujKZoh2v7m91JQcgvT5muNbXvqRq7U8Cz6265030lKtJ8mZGSuCBD3Dm.zxxUO_sWJwvciUnEQwjIfI4bf1PrVm5eVNJfmnCHub_Vr2ekGGjBYY_c_kS4CEBAAA-";

// Standard base64 replacement for URL safe chars if necessary
const safePayload = payload.replace(/-/g, '+').replace(/_/g, '/');
const buffer = Buffer.from(safePayload, 'base64');

zlib.gunzip(buffer, (err, result) => {
    if (err) {
        console.error("Error unzipping:", err);
    } else {
        console.log("Decompressed:", result.toString('utf-8'));
    }
});
