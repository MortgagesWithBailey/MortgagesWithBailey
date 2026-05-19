document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = 'rgba(2, 6, 23, 0.95)';
            navLinks.style.padding = '1rem';
            navLinks.style.backdropFilter = 'blur(10px)';
        });
    }

    // Affordability Calculator Logic
    const incomeInput = document.getElementById('annual-income');
    const debtsInput = document.getElementById('monthly-debts');
    const downPaymentInput = document.getElementById('down-payment');
    const interestRateInput = document.getElementById('interest-rate');
    const locationInput = document.getElementById('calc-location');
    
    const maxPurchasePriceDisplay = document.getElementById('max-purchase-price');
    const maxMortgageDisplay = document.getElementById('max-mortgage');
    const monthlyPaymentDisplay = document.getElementById('monthly-payment');
    const realtorBtn = document.getElementById('realtor-btn');

    let currentMaxPrice = 0;

    function calculateAffordability() {
        const annualIncome = parseFloat(incomeInput.value) || 0;
        const monthlyDebts = parseFloat(debtsInput.value) || 0;
        const downPayment = parseFloat(downPaymentInput.value) || 0;
        const contractRate = parseFloat(interestRateInput.value) || 0;

        const monthlyIncome = annualIncome / 12;
        
        // Stress Test Rate (higher of 5.25% or contract + 2%)
        const qualifyingRate = Math.max(5.25, contractRate + 2);
        
        // Monthly payment factor for qualifying rate (25 year amort)
        const qualMonthlyRate = (qualifyingRate / 100) / 12;
        const numPayments = 25 * 12;
        let cQual = 0;
        if (qualMonthlyRate > 0) {
            cQual = (qualMonthlyRate * Math.pow(1 + qualMonthlyRate, numPayments)) / 
                    (Math.pow(1 + qualMonthlyRate, numPayments) - 1);
        }

        // Monthly payment factor for actual rate
        const actualMonthlyRate = (contractRate / 100) / 12;
        let cActual = 0;
        if (actualMonthlyRate > 0) {
            cActual = (actualMonthlyRate * Math.pow(1 + actualMonthlyRate, numPayments)) / 
                      (Math.pow(1 + actualMonthlyRate, numPayments) - 1);
        } else {
            cActual = 1 / numPayments;
        }

        // Affordability limits
        const maxGdsPayment = (monthlyIncome * 0.39) - 150; // subtracting $150 est heating
        const maxTdsPayment = (monthlyIncome * 0.44) - 150 - monthlyDebts;
        
        const H = Math.min(maxGdsPayment, maxTdsPayment);

        if (H <= 0) {
            currentMaxPrice = 0;
            maxPurchasePriceDisplay.textContent = '$0';
            maxMortgageDisplay.textContent = '$0';
            monthlyPaymentDisplay.textContent = '$0';
            return;
        }

        // Calculate Max Price including estimated property tax (1% annually)
        const taxRateMonthly = 0.01 / 12;
        let maxPrice = (H + downPayment * cQual) / (cQual + taxRateMonthly);
        
        if (maxPrice < downPayment) {
            maxPrice = downPayment;
        }

        currentMaxPrice = Math.floor(maxPrice);
        const maxMortgage = currentMaxPrice - downPayment;
        const actualPayment = maxMortgage * cActual;

        const formatCurrency = (val) => new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);

        maxPurchasePriceDisplay.textContent = formatCurrency(currentMaxPrice);
        maxMortgageDisplay.textContent = formatCurrency(maxMortgage > 0 ? maxMortgage : 0);
        monthlyPaymentDisplay.textContent = formatCurrency(actualPayment > 0 ? actualPayment : 0);
    }

    if (incomeInput) {
        [incomeInput, debtsInput, downPaymentInput, interestRateInput].forEach(input => {
            input.addEventListener('input', calculateAffordability);
        });
        calculateAffordability();
    }

    if (realtorBtn) {
        realtorBtn.addEventListener('click', () => {
            const loc = locationInput.value.trim() || 'Ontario';
            const query = `homes for sale in ${loc} under $${currentMaxPrice}`;
            const url = `https://www.google.com/search?q=${encodeURIComponent(query)}+site%3Arealtor.ca`;
            window.open(url, '_blank');
        });
    }

    // Form Submission Handling via Formspree
    const leadForm = document.getElementById('lead-form');
    const successMsg = document.getElementById('form-success-msg');

    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = leadForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            const formData = new FormData(leadForm);

            try {
                const response = await fetch("https://formspree.io/f/maqkqbor", {
                    method: "POST",
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    successMsg.style.display = 'block';
                    successMsg.style.color = '#10b981';
                    successMsg.textContent = "Thanks! I'll be in touch soon.";
                    leadForm.reset();
                } else {
                    const data = await response.json();
                    if (Object.hasOwn(data, 'errors')) {
                        successMsg.textContent = data["errors"].map(error => error["message"]).join(", ");
                    } else {
                        successMsg.textContent = "Oops! There was a problem submitting your form";
                    }
                    successMsg.style.display = 'block';
                    successMsg.style.color = '#ef4444';
                }
            } catch (error) {
                successMsg.style.display = 'block';
                successMsg.style.color = '#ef4444';
                successMsg.textContent = "Oops! There was a problem submitting your form";
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                
                setTimeout(() => {
                    successMsg.style.display = 'none';
                }, 5000);
            }
        });
    }
});
