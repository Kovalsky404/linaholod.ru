import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";
import { dataset, projectId } from "@/sanity/env";

/**
 * Билдер URL для изображений Sanity (с учётом crop/hotspot).
 * Использование: urlFor(image).width(1200).height(800).url()
 */
const builder = createImageUrlBuilder({ projectId, dataset });

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
