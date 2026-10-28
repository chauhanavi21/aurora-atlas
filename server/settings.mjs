export function defaultSettings(config) {
  return {
    shippingCents:config.shippingCents, freeShippingCents:config.freeShippingCents,
    taxRateBps:config.taxRateBps, allowCod:config.allowCod, checkoutEnabled:true,
    newsletterEnabled:true, supportEmail:config.supportEmail || '', returnDays:30,
    announcement:'LESS FORECAST. MORE POSSIBILITY.', announcementRight:'DESIGNED TO GO FURTHER.',
    heroEyebrow:'A NEW SEASON OF EXPLORATION — VOL. 03', heroTitle:'Outside\nthe ordinary.',
    heroDescription:'Built for the elements. Made for your everyday.\nMeet a new frontier of technical outerwear.',
    heroButton:'Explore the collection', collectionTitle:'Your everyday. Upgraded.',
    storyTitle:'Good equipment.\nGreater possibility.',
    storyText:'We believe the best things you own should take you places. From the morning commute to the unplanned detour, we make considered essentials that do more, so you can carry less.',
    newsletterTitle:'Good things on the horizon.',
    newsletterDescription:'New equipment, field notes, and a little inspiration for getting out there.',
    footerTagline:'EQUIPMENT FOR THE EVERYDAY EXPLORER.',
    shippingPolicy:'Standard delivery is available within the United States. Your full total is shown before placing your order.',
    returnPolicy:'Keep your order reference and contact the store for help with a return.',
    carePolicy:'Follow the care label supplied with your product. Product pages include care information for each piece.',
    contactMessage:'Questions about your order? Keep your order reference handy when contacting the store.',
    featuredProductIds:['boreal','cloud','horizon','transit']
  };
}
export const settingTextLimits = {
  announcement:160, announcementRight:100, heroEyebrow:120, heroTitle:100,
  heroDescription:400, heroButton:60, collectionTitle:100, storyTitle:120,
  storyText:1500, newsletterTitle:120, newsletterDescription:400, footerTagline:160,
  shippingPolicy:2000, returnPolicy:2000, carePolicy:2000, contactMessage:1000
};
