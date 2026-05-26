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

    // Amortization Modal & Chart Logic
    const amortizationBtn = document.getElementById('amortization-btn');
    const amortizationModal = document.getElementById('amortization-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const prepBtns = document.querySelectorAll('.prep-btn');
    const payoffTimeDisplay = document.getElementById('payoff-time');
    const interestSavedDisplay = document.getElementById('interest-saved');
    let amortChart = null;

    if (amortizationBtn && amortizationModal) {
        amortizationBtn.addEventListener('click', () => {
            amortizationModal.style.display = 'block';
            
            // Reset to 0% active button when opening
            prepBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('.prep-btn[data-percent="0"]').classList.add('active');
            
            renderChart(0); // Default to 0 prepayment
        });

        closeModalBtn.addEventListener('click', () => {
            amortizationModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === amortizationModal) {
                amortizationModal.style.display = 'none';
            }
        });

        prepBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                prepBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const prepPercent = parseInt(e.target.getAttribute('data-percent'));
                renderChart(prepPercent);
            });
        });
    }

    function calculateAmortizationSchedule(principal, rate, years, annualPrepaymentPercent) {
        const monthlyRate = (rate / 100) / 12;
        const totalMonths = years * 12;
        
        let balance = principal;
        let c = 0;
        if (monthlyRate > 0) {
            c = (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
        } else {
            c = 1 / totalMonths;
        }
        
        const monthlyPayment = principal * c;
        const annualPrepaymentAmount = principal * (annualPrepaymentPercent / 100);
        
        const balances = [principal];
        let totalInterest = 0;
        let monthsTaken = 0;

        for (let m = 1; m <= totalMonths && balance > 0; m++) {
            const interest = balance * monthlyRate;
            totalInterest += interest;
            let principalPaid = monthlyPayment - interest;
            
            // Apply annual prepayment at the end of every 12th month
            if (m % 12 === 0 && annualPrepaymentPercent > 0) {
                principalPaid += annualPrepaymentAmount;
            }

            balance -= principalPaid;
            if (balance < 0) balance = 0;
            
            // Record balance yearly to make the chart cleaner
            if (m % 12 === 0 || balance === 0) {
                balances.push(balance);
            }
            monthsTaken = m;
        }
        
        return {
            balances,
            totalInterest,
            monthsTaken
        };
    }

    function renderChart(prepPercent) {
        const downPayment = parseFloat(downPaymentInput.value) || 0;
        const principal = currentMaxPrice - downPayment;
        const rate = parseFloat(interestRateInput.value) || 0;
        
        if (principal <= 0) return;

        // Baseline (0% prepayment)
        const baseSchedule = calculateAmortizationSchedule(principal, rate, 25, 0);
        // Prepayment Schedule
        const prepSchedule = calculateAmortizationSchedule(principal, rate, 25, prepPercent);

        // Generate labels for X axis (Years)
        const maxYears = Math.max(Math.ceil(baseSchedule.monthsTaken / 12), Math.ceil(prepSchedule.monthsTaken / 12));
        const labels = Array.from({length: maxYears + 1}, (_, i) => `Year ${i}`);

        if (amortChart) {
            amortChart.destroy();
        }

        const ctx = document.getElementById('amortizationChart').getContext('2d');
        
        Chart.defaults.color = '#cbd5e1'; // Set global chart text color to match theme
        
        amortChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Balance (No Prepayment)',
                        data: baseSchedule.balances,
                        borderColor: 'rgba(203, 213, 225, 0.5)', // Muted color for baseline
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: `Balance (${prepPercent}% Prepayment)`,
                        data: prepSchedule.balances,
                        borderColor: '#f59e0b', // Accent amber
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        fill: true,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#f8fafc'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000).toFixed(0) + 'k'; // Format as $500k
                            }
                        }
                    }
                }
            }
        });

        const yearsTaken = (prepSchedule.monthsTaken / 12).toFixed(1);
        payoffTimeDisplay.textContent = `${yearsTaken} Years`;

        const interestSaved = baseSchedule.totalInterest - prepSchedule.totalInterest;
        const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
        interestSavedDisplay.textContent = formatCurrency(interestSaved > 0 ? interestSaved : 0);
    }
    
    // Break Penalty Modal Logic
    const penaltyBtn = document.getElementById('penalty-btn');
    const penaltyModal = document.getElementById('penalty-modal');
    const closePenaltyBtn = document.getElementById('close-penalty');
    
    const penaltyMortgageType = document.getElementById('mortgage-type');
    const penaltyBalance = document.getElementById('penalty-balance');
    const penaltyMonths = document.getElementById('penalty-months');
    const penaltyContractRate = document.getElementById('penalty-contract-rate');
    const penaltyMarketRate = document.getElementById('penalty-market-rate');
    const marketRateGroup = document.getElementById('market-rate-group');
    const estPenaltyCost = document.getElementById('est-penalty-cost');
    const penaltyExplanation = document.getElementById('penalty-explanation');

    if (penaltyBtn && penaltyModal) {
        penaltyBtn.addEventListener('click', () => {
            penaltyModal.style.display = 'block';
            calculatePenalty();
        });

        closePenaltyBtn.addEventListener('click', () => {
            penaltyModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === penaltyModal) {
                penaltyModal.style.display = 'none';
            }
        });

        // Toggle Market Rate visibility based on Mortgage Type
        penaltyMortgageType.addEventListener('change', () => {
            if (penaltyMortgageType.value === 'variable') {
                marketRateGroup.style.display = 'none';
            } else {
                marketRateGroup.style.display = 'block';
            }
            calculatePenalty();
        });

        // Recalculate on input changes
        [penaltyBalance, penaltyMonths, penaltyContractRate, penaltyMarketRate].forEach(input => {
            input.addEventListener('input', calculatePenalty);
        });
    }

    function calculatePenalty() {
        const type = penaltyMortgageType.value;
        const balance = parseFloat(penaltyBalance.value) || 0;
        const months = parseInt(penaltyMonths.value) || 0;
        const contractRate = parseFloat(penaltyContractRate.value) || 0;
        const marketRate = parseFloat(penaltyMarketRate.value) || 0;

        const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

        if (balance <= 0) {
            estPenaltyCost.textContent = '$0';
            penaltyExplanation.textContent = 'Please enter a valid balance.';
            return;
        }

        // 3 Months Interest Calculation
        const threeMonthsInterest = balance * (contractRate / 100 / 12) * 3;

        if (type === 'variable') {
            estPenaltyCost.textContent = formatCurrency(threeMonthsInterest);
            penaltyExplanation.textContent = 'Based on standard 3-months interest for Variable rates.';
        } else {
            // IRD Calculation
            let rateDiff = (contractRate - marketRate) / 100;
            if (rateDiff < 0) rateDiff = 0; // IRD is 0 if market rate is higher
            
            const ird = balance * rateDiff * (months / 12);
            
            if (ird > threeMonthsInterest) {
                estPenaltyCost.textContent = formatCurrency(ird);
                penaltyExplanation.textContent = `Based on Interest Rate Differential (IRD) as it is greater than 3-months interest (${formatCurrency(threeMonthsInterest)}).`;
            } else {
                estPenaltyCost.textContent = formatCurrency(threeMonthsInterest);
                if (ird > 0) {
                    penaltyExplanation.textContent = `Based on 3-months interest as it is greater than the IRD (${formatCurrency(ird)}).`;
                } else {
                    penaltyExplanation.textContent = `Based on 3-months interest. IRD does not apply because the market rate is higher than your contract rate.`;
                }
            }
        }
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
