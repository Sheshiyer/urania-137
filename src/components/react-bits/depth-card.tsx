"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import "./depth-card.css";

interface DepthLayer {
  /** Image URL for this layer */
  image: string;
  /** Depth multiplier for parallax effect (higher = more movement) */
  depth: number;
}

export interface DepthCardProps {
  /** Background image URL for the card */
  image?: string;

  /** Card title */
  title: string;

  /** Card description/content */
  description?: string;

  /** Width of the card in pixels */
  width?: number;

  /** Height of the card in pixels */
  height?: number;

  /** Maximum rotation angle in degrees */
  maxRotation?: number;

  /** Maximum translation for parallax effect in pixels */
  maxTranslation?: number;

  /** Border radius of the card */
  borderRadius?: string;

  /** Additional CSS classes for the wrapper */
  className?: string;

  /** Additional CSS classes for the card content */
  contentClassName?: string;

  /** Callback when card is clicked */
  onClick?: () => void;

  /** URL to navigate to when card is clicked */
  href?: string;

  /** Target for link navigation */
  target?: "_blank" | "_self" | "_parent" | "_top";

  /** Disable 3D effects on mobile devices */
  disableOnMobile?: boolean;

  /** ARIA label for accessibility */
  ariaLabel?: string;

  /** Multiple layers for advanced parallax effect */
  layers?: DepthLayer[];

  /** Respect user's reduced motion preference */
  respectReducedMotion?: boolean;

  /** Enable spotlight effect */
  spotlight?: boolean;

  /** Color of the spotlight */
  spotlightColor?: string;
}

const DepthCard: React.FC<DepthCardProps> = ({
  image,
  title,
  description,
  width = 240,
  height = 320,
  maxRotation = 20,
  maxTranslation = 20,
  borderRadius = "16px",
  className,
  contentClassName,
  onClick,
  href,
  target = "_self",
  disableOnMobile = false,
  ariaLabel,
  layers,
  respectReducedMotion = true,
  spotlight = true,
  spotlightColor = "rgba(255, 255, 255, 0.5)",
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const targetRef = useRef({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  const currentRef = useRef({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!disableOnMobile) return;
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) || window.innerWidth < 768,
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [disableOnMobile]);

  useEffect(() => {
    if (!respectReducedMotion) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    handler({ matches: mediaQuery.matches } as MediaQueryListEvent);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [respectReducedMotion]);

  const shouldDisableEffects =
    (disableOnMobile && isMobile) || prefersReducedMotion;

  useEffect(() => {
    if (shouldDisableEffects) return;

    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;

    const animate = () => {
      const target = targetRef.current;
      const current = currentRef.current;

      current.x = lerp(current.x, target.x, 0.1);
      current.y = lerp(current.y, target.y, 0.1);
      current.rotateX = lerp(current.rotateX, target.rotateX, 0.1);
      current.rotateY = lerp(current.rotateY, target.rotateY, 0.1);

      if (innerRef.current) {
        innerRef.current.style.transform = `rotateX(${current.rotateX}deg) rotateY(${current.rotateY}deg)`;
      }

      if (layers && layers.length > 0) {
        layerRefs.current.forEach((layer, index) => {
          if (layer) {
            const depth = layers[index].depth;
            layer.style.transform = `translateX(${current.x * depth}px) translateY(${current.y * depth}px) scale(1.3)`;
          }
        });
      } else if (layerRefs.current[0]) {
        layerRefs.current[0].style.transform = `translateX(${current.x}px) translateY(${current.y}px) scale(1.3)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [shouldDisableEffects, layers]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement | HTMLAnchorElement>) => {
      if (!cardRef.current || shouldDisableEffects) return;

      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      if (spotlight && spotlightRef.current) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        spotlightRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, ${spotlightColor} 0%, rgba(255, 255, 255, 0.1) 40%, transparent 100%)`;
      }

      const percentX = mouseX / (rect.width / 2);
      const percentY = mouseY / (rect.height / 2);

      targetRef.current = {
        x: percentX * -maxTranslation,
        y: percentY * -maxTranslation,
        rotateX: percentY * -maxRotation,
        rotateY: percentX * maxRotation,
      };
    },
    [
      maxRotation,
      maxTranslation,
      shouldDisableEffects,
      spotlight,
      spotlightColor,
    ],
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (spotlightRef.current) {
      spotlightRef.current.style.opacity = "1";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    targetRef.current = { x: 0, y: 0, rotateX: 0, rotateY: 0 };
    if (spotlightRef.current) {
      spotlightRef.current.style.opacity = "0";
    }
  }, []);

  const handleClick = useCallback(() => {
    if (href) {
      if (target === "_blank") {
        window.open(href, target, "noopener,noreferrer");
      } else {
        window.location.href = href;
      }
    }
    onClick?.();
  }, [href, target, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement | HTMLAnchorElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const CardWrapper = href ? "a" : "div";
  const wrapperProps = href
    ? {
        href,
        target,
        rel: target === "_blank" ? "noopener noreferrer" : undefined,
      }
    : {};

  return (
    <CardWrapper
      {...wrapperProps}
      ref={cardRef as React.RefObject<HTMLDivElement & HTMLAnchorElement>}
      className={`depth-card-wrapper ${onClick || href ? "depth-card-clickable" : ""} ${className || ""}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        perspective: "1000px",
        borderRadius,
        overflow: "hidden",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick && !href ? handleClick : undefined}
      onKeyDown={onClick || href ? handleKeyDown : undefined}
      role={onClick || href ? "button" : undefined}
      tabIndex={onClick || href ? 0 : undefined}
      aria-label={ariaLabel || `${title} card`}
    >
      <div
        ref={innerRef}
        className={`depth-card ${isHovered ? "depth-card-hovered" : ""}`}
        style={{
          borderRadius,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          willChange: "transform",
          clipPath: `inset(0 round ${borderRadius})`,
          boxShadow: isHovered
            ? "0 20px 40px rgba(0,0,0,0.4)"
            : "0 10px 20px rgba(0,0,0,0.2)",
        }}
      >
        <div
          className="depth-card-bg-container"
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            borderRadius,
          }}
        >
          {layers && layers.length > 0 ? (
            layers.map((layer, index) => (
              <div
                key={index}
                ref={(el) => {
                  layerRefs.current[index] = el;
                }}
                className="depth-card-bg"
                style={{
                  backgroundImage: `url(${layer.image})`,
                  zIndex: index,
                  opacity: index === 0 ? 1 : 0.6,
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  position: "absolute",
                  inset: 0,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />
            ))
          ) : (
            <div
              ref={(el) => {
                layerRefs.current[0] = el;
              }}
              className="depth-card-bg"
              style={{
                backgroundImage: `url(${image})`,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                position: "absolute",
                inset: 0,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </div>

        {spotlight && (
          <div
            ref={spotlightRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              transition: "opacity 300ms ease-out",
              opacity: 0,
              pointerEvents: "none",
              mixBlendMode: "soft-light",
              filter: "blur(2px)",
            }}
          />
        )}

        <div
          className={`depth-card-info depth-card-info-p-4 ${contentClassName || ""}`}
        >
          <div className="depth-card-gradient" />

          <div className="depth-card-content depth-card-content-pb-4">
            <h3
              className="depth-card-title"
              style={{
                transform: isHovered ? "translateY(0)" : "translateY(4px)",
                opacity: isHovered ? 1 : 0.9,
                transition: "all 500ms ease",
                marginBottom: "8px",
                color: "white",
              }}
            >
              {title}
            </h3>
            {description && (
              <p
                className="depth-card-description"
                style={{
                  transform: isHovered ? "translateY(0)" : "translateY(4px)",
                  opacity: isHovered ? 1 : 0,
                  transition: "all 500ms ease 75ms",
                  color: "#e5e7eb",
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </CardWrapper>
  );
};

DepthCard.displayName = "DepthCard";

export default DepthCard;
