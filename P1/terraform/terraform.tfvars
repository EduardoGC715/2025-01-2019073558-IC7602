aws_ami  = "ami-0f9de6e2d2f067fca"
api_port = 443
checkers = [
  {
    id        = "us-east"
    lat       = "40.7128"
    lon       = "-74.0060"
    country   = "USA"
    continent = "North America"
  },
  {
    id        = "europe"
    lat       = "48.8566"
    lon       = "2.3522"
    country   = "France"
    continent = "Europe"
  },
  {
    id        = "central-america"
    lat       = "9.9281"
    lon       = "-84.0907"
    country   = "Costa Rica"
    continent = "Central America"
  }
]
dns_server = {
  host = "8.8.8.8"
  port = 53
}

# ,
#   {
#     id        = "south-america"
#     lat       = "-23.5505"
#     lon       = "-46.6333"
#     country   = "Brazil"
#     continent = "South America"
#   },
#   {
#     id        = "africa"
#     lat       = "-1.2864"
#     lon       = "36.8172"
#     country   = "Kenya"
#     continent = "Africa"
#   },
#   {
#     id        = "asia"
#     lat       = "35.6895"
#     lon       = "139.6917"
#     country   = "Japan"
#     continent = "Asia"
#   },
#   {
#     id        = "oceania"
#     lat       = "-33.8688"
#     lon       = "151.2093"
#     country   = "Australia"
#     continent = "Oceania"
#   }