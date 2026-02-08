import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GeminiService } from '../gemini.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  countries = [
    { 
      name: 'Kenya', 
      image: 'https://flagcdn.com/w80/ke.png', 
      motto: 'Sheria • Haki • Uwazi' 
    },
    { 
      name: 'Uganda', 
      image: 'https://flagcdn.com/w80/ug.png', 
      motto: 'For God and My Country' 
    },
    { 
      name: 'Tanzania', 
      image: 'https://flagcdn.com/w80/tz.png', 
      motto: 'Uhuru na Umoja' 
    }
  ];

  constructor(public geminiService: GeminiService) {}

  selectCountry(country: any) {
    this.geminiService.setCountry(country.name, country.motto);
  }
}