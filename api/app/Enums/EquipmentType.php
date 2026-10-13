<?php

namespace App\Enums;

enum EquipmentType: string
{
    case Telescope = 'telescope';
    case Mount = 'mount';
    case Camera = 'camera';
    case Binoculars = 'binoculars';
    case Accessory = 'accessory';
}
