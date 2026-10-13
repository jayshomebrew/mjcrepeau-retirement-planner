import { useCountry } from '../contexts/CountryContext';
import type { CountryCode } from '../countries';

export function CountrySelector() {
  const { country, setCountry } = useCountry();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value as CountryCode;
    if (newCountry !== country) {
      setCountry(newCountry);
    }
  };

  return (
    <label className="block">
      <span className="sr-only">Country</span>
      <select
        value={country}
        onChange={handleChange}
        title="Country and currency. Switching resets your plan to that country's defaults."
        className="field font-sans text-[13px] font-medium py-1.5 pl-3 rounded-full"
      >
        <option value="US">United States (USD)</option>
        <option value="CA">Canada (CAD)</option>
      </select>
    </label>
  );
}
