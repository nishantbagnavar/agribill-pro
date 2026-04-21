const { z } = require('zod');

const maybeNumber = z.preprocess(
  (val) => {
    console.log("val received:", val, typeof val);
    const parsed = val === '' || val === null || Number.isNaN(Number(val)) ? undefined : Number(val);
    console.log("preprocess returning:", parsed, typeof parsed);
    return parsed;
  }, 
  z.number().min(0, 'Required')
);

const schema = z.object({
  purchase_price: maybeNumber
});

const result = schema.safeParse({ purchase_price: "5050" });
console.log(result.success ? "Success" : result.error.errors);
