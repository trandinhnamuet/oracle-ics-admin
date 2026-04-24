import { Star } from "lucide-react"
import { PricingPlan } from "./pricing-types"

// Custom Plan — still displayed as a static card on the homepage
export const customPlan: PricingPlan = {
  id: 0,
  name: "custom",
  description: "pricing.plans.custom.description",
  price: "pricing.plans.custom.price",
  priceVnd: 0,
  period: "",
  icon: Star,
  popular: false,
  category: 'custom',
  features: [
    "pricing.plans.custom.features.flexible",
    "pricing.plans.custom.features.integration",
    "pricing.plans.custom.features.consulting",
    "pricing.plans.custom.features.onsite"
  ],
  limitations: [],
}
