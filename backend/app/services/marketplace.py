import json
from typing import Any


SUGGESTED_DATASETS = {
    "demographics": {
        "name": "Demographics by Region",
        "description": "Population, income, age distribution, education levels by region",
        "source": "US Census Bureau / World Bank",
        "join_key": "region",
    },
    "weather": {
        "name": "Weather History",
        "description": "Daily temperature, precipitation, humidity by location and date",
        "source": "NOAA / OpenWeatherMap",
        "join_key": "date",
    },
    "economic": {
        "name": "Economic Indicators",
        "description": "GDP, inflation, unemployment, interest rates by country/quarter",
        "source": "World Bank / IMF",
        "join_key": "country",
    },
    "geographic": {
        "name": "Geographic Data",
        "description": "Latitude, longitude, timezone, country/state/city mappings",
        "source": "GeoNames / OpenStreetMap",
        "join_key": "location",
    },
    "social_media": {
        "name": "Social Media Trends",
        "description": "Twitter/X trends, Reddit mentions, Google Trends by topic and date",
        "source": "Various APIs",
        "join_key": "date",
    },
    "industry_benchmarks": {
        "name": "Industry Benchmarks",
        "description": "Average metrics, KPIs, and performance standards by industry",
        "source": "Industry reports / Statista",
        "join_key": "industry",
    },
    "consumer_spending": {
        "name": "Consumer Spending Patterns",
        "description": "Category-wise spending, seasonal trends, demographic breakdowns",
        "source": "Bureau of Labor Statistics",
        "join_key": "demographic",
    },
    "real_estate": {
        "name": "Real Estate Data",
        "description": "Property values, rent trends, housing metrics by location",
        "source": "Zillow / Redfin",
        "join_key": "location",
    },
    "ecommerce": {
        "name": "E-Commerce Trends",
        "description": "Average order values, conversion rates, category performance",
        "source": "Shopify / Statista",
        "join_key": "category",
    },
    "healthcare": {
        "name": "Healthcare Statistics",
        "description": "Hospital readmission rates, procedure costs, patient demographics",
        "source": "CMS / WHO",
        "join_key": "region",
    },
}


def suggest_datasets(df, dataset_name: str = "") -> list[dict]:
    df_str = dataset_name.lower() if dataset_name else ""
    cols_lower = [c.lower() for c in df.columns]

    scores = {}
    for key, info in SUGGESTED_DATASETS.items():
        score = 0
        join_key = info["join_key"]
        if any(join_key in c or c in join_key for c in cols_lower):
            score += 5
        if any(w in df_str for w in info["name"].lower().split()):
            score += 3
        if any(w in df_str for w in key.lower().split()):
            score += 2
        scores[key] = score

    sorted_suggestions = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    result = []
    for key, score in sorted_suggestions[:5]:
        info = SUGGESTED_DATASETS[key]
        result.append({
            "key": key,
            "name": info["name"],
            "description": info["description"],
            "source": info["source"],
            "join_key": info["join_key"],
            "relevance_score": min(score, 10),
            "suggested_join": f"Join on {info['join_key']} column",
        })

    if not result:
        result = [
            {
                "key": "demographics",
                "name": "Demographics by Region",
                "description": "Enrich with population, income, and education data",
                "source": "US Census Bureau / World Bank",
                "join_key": "region",
                "relevance_score": 5,
                "suggested_join": "Join on a region or location column",
            },
            {
                "key": "economic",
                "name": "Economic Indicators",
                "description": "Add GDP, inflation, and unemployment context",
                "source": "World Bank / IMF",
                "join_key": "country/year",
                "relevance_score": 4,
                "suggested_join": "Join on a country or date column",
            },
        ]

    return result
