import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SHARED_PACKAGE_NAME } from '@contratados-rpg/shared';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
  // Import de teste da ligação de workspace — substituído por conteúdo real na task m0-05.
  protected readonly sharedPackageName = signal(SHARED_PACKAGE_NAME);
}
