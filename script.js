// Free API from ExchangeRate-API (no API key needed for basic usage)
const API_URL = 'https://api.exchangerate-api.com/v4/latest/';

// Cache for storing exchange rates to avoid too many API calls
let exchangeRatesCache = {};
let lastUpdateTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

class CurrencyConverter {
    constructor() {
        this.initializeEventListeners();
        this.loadDefaultRates();
    }

    initializeEventListeners() {
        // Convert button click
        document.getElementById('convert-btn').addEventListener('click', () => {
            this.convertCurrency();
        });

        // Enter key press in amount field
        document.getElementById('amount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.convertCurrency();
            }
        });

        // Swap currencies button
        document.getElementById('swap-btn').addEventListener('click', () => {
            this.swapCurrencies();
        });

        // Auto-convert when currency selection changes
        document.getElementById('from').addEventListener('change', () => {
            this.convertCurrency();
        });

        document.getElementById('to').addEventListener('change', () => {
            this.convertCurrency();
        });

        // Auto-convert when amount changes (with debounce)
        let timeout;
        document.getElementById('amount').addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.convertCurrency();
            }, 500);
        });
    }

    async loadDefaultRates() {
        // Load USD rates by default
        try {
            await this.fetchExchangeRates('USD');
            this.updateDisplay(1, 'USD', 'EUR', 0.85); // Default display
        } catch (error) {
            this.showError('Failed to load initial exchange rates');
        }
    }

    async fetchExchangeRates(baseCurrency) {
        // Check if we have fresh cached data
        if (exchangeRatesCache[baseCurrency] && 
            Date.now() - (exchangeRatesCache[baseCurrency].timestamp || 0) < CACHE_DURATION) {
            return exchangeRatesCache[baseCurrency].rates;
        }

        try {
            const response = await fetch(`${API_URL}${baseCurrency}`);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            // Cache the results
            exchangeRatesCache[baseCurrency] = {
                rates: data.rates,
                timestamp: Date.now()
            };
            
            lastUpdateTime = new Date().toLocaleString();
            return data.rates;
            
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
            throw new Error('Failed to fetch exchange rates. Please check your internet connection.');
        }
    }

    async convertCurrency() {
        const amount = parseFloat(document.getElementById('amount').value);
        const fromCurrency = document.getElementById('from').value;
        const toCurrency = document.getElementById('to').value;

        // Validation
        if (isNaN(amount) || amount <= 0) {
            this.showError('Please enter a valid amount greater than 0');
            return;
        }

        if (fromCurrency === toCurrency) {
            this.updateDisplay(amount, fromCurrency, toCurrency, amount);
            return;
        }

        try {
            this.showLoading();
            const rates = await this.fetchExchangeRates(fromCurrency);
            const exchangeRate = rates[toCurrency];
            
            if (!exchangeRate) {
                throw new Error('Exchange rate not available for selected currencies');
            }

            const convertedAmount = amount * exchangeRate;
            this.updateDisplay(amount, fromCurrency, toCurrency, convertedAmount);
            this.hideError();
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    updateDisplay(originalAmount, fromCurrency, toCurrency, convertedAmount) {
        const resultElement = document.getElementById('result');
        const amountElement = resultElement.querySelector('.result-amount');
        const dateElement = resultElement.querySelector('.result-date');

        amountElement.textContent = 
            `${this.formatNumber(originalAmount)} ${fromCurrency} = ${this.formatNumber(convertedAmount)} ${toCurrency}`;
        
        dateElement.textContent = lastUpdateTime ? `Last updated: ${lastUpdateTime}` : 'Rates loading...';
    }

    swapCurrencies() {
        const fromSelect = document.getElementById('from');
        const toSelect = document.getElementById('to');
        
        const tempValue = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = tempValue;
        
        // Trigger conversion after swap
        this.convertCurrency();
    }

    showLoading() {
        const resultElement = document.getElementById('result');
        resultElement.querySelector('.result-amount').textContent = 'Converting...';
        resultElement.querySelector('.result-date').textContent = 'Please wait';
    }

    showError(message) {
        const errorElement = document.getElementById('error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        const resultElement = document.getElementById('result');
        resultElement.querySelector('.result-amount').textContent = 'Conversion failed';
        resultElement.querySelector('.result-date').textContent = 'See error below';
    }

    hideError() {
        const errorElement = document.getElementById('error');
        errorElement.style.display = 'none';
    }

    formatNumber(number) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(number);
    }
}

// Additional currency data for more options
const popularCurrencies = [
    {code: 'USD', name: 'US Dollar'},
    {code: 'EUR', name: 'Euro'},
    {code: 'GBP', name: 'British Pound'},
    {code: 'JPY', name: 'Japanese Yen'},
    {code: 'INR', name: 'Indian Rupee'},
    {code: 'CAD', name: 'Canadian Dollar'},
    {code: 'AUD', name: 'Australian Dollar'},
    {code: 'CHF', name: 'Swiss Franc'},
    {code: 'CNY', name: 'Chinese Yuan'},
    {code: 'HKD', name: 'Hong Kong Dollar'},
    {code: 'SGD', name: 'Singapore Dollar'},
    {code: 'NZD', name: 'New Zealand Dollar'}
];

// Populate currency dropdowns with more options
function populateCurrencyDropdowns() {
    const fromSelect = document.getElementById('from');
    const toSelect = document.getElementById('to');
    
    // Clear existing options (keep the first few)
    while (fromSelect.options.length > 7) fromSelect.remove(7);
    while (toSelect.options.length > 7) toSelect.remove(7);
    
    // Add more currency options
    popularCurrencies.forEach(currency => {
        if (!fromSelect.querySelector(`option[value="${currency.code}"]`)) {
            const option = new Option(`${currency.code} - ${currency.name}`, currency.code);
            fromSelect.add(option);
        }
        
        if (!toSelect.querySelector(`option[value="${currency.code}"]`)) {
            const option = new Option(`${currency.code} - ${currency.name}`, currency.code);
            toSelect.add(option);
        }
    });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    populateCurrencyDropdowns();
    new CurrencyConverter();
    
    // Perform initial conversion
    setTimeout(() => {
        document.querySelector('.currency-converter').convertCurrency();
    }, 1000);
});

// Make converter globally available for debugging
window.currencyConverter = new CurrencyConverter();