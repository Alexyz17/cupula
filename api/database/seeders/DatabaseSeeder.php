<?php

namespace Database\Seeders;

use App\Enums\EquipmentType;
use App\Models\Equipment;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /** Club de ejemplo para desarrollo local. Las contraseñas solo sirven en local. */
    public function run(): void
    {
        $admin = User::factory()->admin()->create([
            'name' => 'Coordinación del club',
            'email' => 'admin@cupula.test',
            'password' => 'cupula2026',
        ]);

        $member = User::factory()->create([
            'name' => 'Laura Martín',
            'email' => 'socia@cupula.test',
            'password' => 'cupula2026',
        ]);

        $others = User::factory()->count(4)->create();

        $catalog = [
            ['Dobson 254/1200', EquipmentType::Telescope, 254, 1200, 'Gran apertura para cielo profundo: galaxias, nebulosas y cúmulos. Montura altacimutal, fácil de usar.'],
            ['Refractor apocromático 80/480', EquipmentType::Telescope, 80, 480, 'Ligero y con colores fieles. Ideal para empezar y para astrofotografía de campo amplio.'],
            ['Schmidt-Cassegrain 203/2032', EquipmentType::Telescope, 203, 2032, 'Mucha focal en poco tubo: Luna, planetas y estrellas dobles.'],
            ['Montura ecuatorial EQ6', EquipmentType::Mount, null, null, 'Montura motorizada con seguimiento para sesiones largas y fotografía.'],
            ['Cámara planetaria color', EquipmentType::Camera, null, null, 'Vídeo a alta velocidad para apilar imágenes de Júpiter, Saturno y la Luna.'],
            ['Prismáticos 15x70', EquipmentType::Binoculars, 70, null, 'Para recorrer la Vía Láctea y buscar cometas sin montar nada.'],
            ['Filtro solar de película', EquipmentType::Accessory, null, null, 'Imprescindible para observar el Sol con seguridad.'],
        ];

        $equipment = collect($catalog)->map(fn (array $e) => Equipment::create([
            'name' => $e[0],
            'type' => $e[1],
            'aperture_mm' => $e[2],
            'focal_length_mm' => $e[3],
            'description' => $e[4],
        ]));

        // Unas cuantas noches ya reservadas a partir de mañana (21:00 en Madrid).
        $tz = config('cupula.timezone');
        $nights = [[1, 0, $member], [1, 1, $others[0]], [2, 2, $others[1]], [3, 0, $others[2]], [5, 3, $member], [6, 1, $admin]];

        foreach ($nights as [$day, $equipmentIndex, $user]) {
            $start = now($tz)->addDays($day)->setTime(21, 0)->utc();
            $reservation = new Reservation([
                'equipment_id' => $equipment[$equipmentIndex]->id,
                'starts_at' => $start,
                'ends_at' => $start->copy()->addHours(2),
            ]);
            $reservation->user()->associate($user)->save();
        }
    }
}
