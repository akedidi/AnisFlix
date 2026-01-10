
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function (c) {
        return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decode(input) {
    try {
        console.log("Input:", input);
        const step1 = Buffer.from(input, 'base64').toString('binary');
        // console.log("Step 1 (B64):", step1);

        const step2 = Buffer.from(step1, 'base64').toString('binary');
        // console.log("Step 2 (B64):", step2);

        const step3 = rot13(step2);
        // console.log("Step 3 (Rot13):", step3);

        const step4 = Buffer.from(step3, 'base64').toString('binary');
        console.log("Step 4 (B64 -> JSON):", step4);

        const json = JSON.parse(step4);
        console.log("JSON:", json);

        if (json && json.o) {
            const final = Buffer.from(json.o, 'base64').toString('binary');
            console.log("FINAL URL:", final);
            return final;
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

const capturedString = "Y214WE0xWjNZbXRhVUdwMmIxQldObFo2ZFRCeFZVOXRRbmxxYVV0UU9XRk1Ta1ZoVFV0RmJYRXlTWFpaWVhVMWNubHFhVzVVT1dkTlNtdDFiM3BGZVhCNWFtbFdkbXAyYjJ4V05sWjZVMVpJZDA5M1JsSXdNa2RWZURWdk1rVkxSbnBuZDI5S2FteEtlVm94Y25wQlZVVjZZMjVJYlhsblRFbHhORzlTYXpaSVIwOURSVlJtTUVkaFkwOWFTREUyUmtjd2RuTkVQVDA9";

decode(capturedString);
