import React from 'react';
import { VetrifyLogo, VetrifyLogoProps } from './VetrifyLogo';

export type RxLogoProps = VetrifyLogoProps;
export const RxLogo: React.FC<RxLogoProps> = (props) => {
  return <VetrifyLogo {...props} />;
};

export default RxLogo;
