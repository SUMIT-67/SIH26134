import urllib.robotparser
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

class RobotsChecker:
    """
    Validates robots.txt compliance to ensure ethical, non-intrusive scraping.
    """
    def __init__(self, user_agent: str = "AirfareIndexBot/1.0 (MoSPI-SIH2026-Demo)"):
        self.user_agent = user_agent
        self.parsers = {}

    def is_allowed(self, target_url: str) -> bool:
        try:
            parsed = urlparse(target_url)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            robots_url = f"{base_url}/robots.txt"

            if base_url not in self.parsers:
                rp = urllib.robotparser.RobotFileParser()
                rp.set_url(robots_url)
                try:
                    rp.read()
                    self.parsers[base_url] = rp
                except Exception as e:
                    logger.warning(f"Could not read robots.txt from {robots_url}: {e}")
                    # In safe mode, default to polite restriction if unavailable
                    return True

            rp = self.parsers[base_url]
            return rp.can_fetch(self.user_agent, target_url)
        except Exception as e:
            logger.error(f"Error checking robots.txt for {target_url}: {e}")
            return False
