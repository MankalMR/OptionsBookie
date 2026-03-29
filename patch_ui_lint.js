const fs = require('fs');
const file = 'src/components/analytics/TransactionsTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `} catch (err: any) {`,
  `} catch (err: unknown) {
      if (err instanceof Error) {
        setAiError(err.message || "Something went wrong");
      } else {
        setAiError("Something went wrong");
      }`
);
// Make sure to remove old setAiError inside catch block
content = content.replace(
  `} catch (err: unknown) {
      if (err instanceof Error) {
        setAiError(err.message || "Something went wrong");
      } else {
        setAiError("Something went wrong");
      }
      setAiError(err.message || "Something went wrong");`,
  `} catch (err: unknown) {
      if (err instanceof Error) {
        setAiError(err.message || "Something went wrong");
      } else {
        setAiError("Something went wrong");
      }`
);

fs.writeFileSync(file, content);
